import { NextRequest, NextResponse } from 'next/server'
import { extractAllFields } from '@/lib/ocr/fieldExtractor'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Vision API key not configured' }, { status: 500 })
  }

  // Rate limiting: enforce a daily cap on Google Vision API calls
  const supabase = createAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('table_name', 'ocr_calls')
    .gte('performed_at', todayStart.toISOString())
  const dailyLimit = parseInt(process.env.OCR_DAILY_LIMIT || '20')
  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { error: `Daily OCR limit of ${dailyLimit} scans reached. Try again tomorrow.` },
      { status: 429 }
    )
  }

  const formData = await req.formData()
  const files = formData.getAll('file') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File "${file.name}" is too large. Maximum size is 10MB.` },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File "${file.name}" is an unsupported type. Please upload a PDF, JPG, PNG, or WebP.` },
        { status: 400 }
      )
    }
  }

  // PDF path: single file, handled via files:annotate (already multi-page aware)
  if (files.length === 1 && files[0].type === 'application/pdf') {
    const file = files[0]
    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64')

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(55_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            inputConfig: { content: imageBase64, mimeType: 'application/pdf' },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            pages: [1, 2, 3, 4, 5],
          }],
        }),
      }
    )

    if (!visionRes.ok) {
      const err = await visionRes.text()
      return NextResponse.json({ error: `Vision API error: ${err}` }, { status: 500 })
    }

    const visionData = await visionRes.json()
    const pageResponses: Array<{ fullTextAnnotation?: { text?: string } }> =
      visionData.responses?.[0]?.responses ?? []
    const rawText = pageResponses
      .map((p, i) => `--- PAGE ${i + 1} ---\n${p.fullTextAnnotation?.text ?? ''}`)
      .join('\n')
    const extracted = extractAllFields(rawText)

    await logAudit('CREATE', 'ocr_calls', crypto.randomUUID(),
      `${file.name} · ${Math.round(file.size / 1024)}KB · PDF`)

    return NextResponse.json({ rawText, ...extracted })
  }

  // Image path: one or more images — call Vision once per image, concatenate with page markers
  const pageTexts: string[] = []
  for (const file of files) {
    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64')

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: imageBase64 }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
        }),
      }
    )

    if (!visionRes.ok) {
      const err = await visionRes.text()
      return NextResponse.json({ error: `Vision API error: ${err}` }, { status: 500 })
    }

    const visionData = await visionRes.json()
    pageTexts.push(visionData.responses?.[0]?.fullTextAnnotation?.text ?? '')
  }

  const rawText = pageTexts
    .map((text, i) => `--- PAGE ${i + 1} ---\n${text}`)
    .join('\n')
  const extracted = extractAllFields(rawText)

  const totalKb = files.reduce((sum, f) => sum + f.size, 0) / 1024
  await logAudit('CREATE', 'ocr_calls', crypto.randomUUID(),
    `${files.length} image(s) · ${Math.round(totalKb)}KB`)

  return NextResponse.json({ rawText, ...extracted })
}
