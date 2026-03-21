import { NextRequest, NextResponse } from 'next/server'

const CATS = ['Food','Grocery','Transport','Fuel','Shopping','Health','Entertainment','Bills','Rent','EMI','Education','Travel','Salary','Freelance','Investment','Other']

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Extract ALL financial transactions from the text. Return ONLY a valid JSON array. No markdown, no explanation.
Format: [{"description":"Merchant","amount":1234.56,"type":"expense","category":"Food","date":"yyyy-MM-dd","time":"HH:mm"}]
type: expense|income|transfer. category must be one of: ${CATS.join(',')}. Today: ${today}. Return [] if none found.`,
      messages: [{ role: 'user', content: `Extract transactions:\n\n${text}` }],
    }),
  })

  const data = await resp.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message || 'Anthropic error' }, { status: 502 })
  }

  const raw = data.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('') || '[]'

  let parsed = []
  for (const fn of [
    () => JSON.parse(raw.trim()),
    () => { const m = raw.match(/\[[\s\S]*\]/); if (m) return JSON.parse(m[0]); throw 0 },
    () => { const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) return JSON.parse(m[1]); throw 0 },
  ]) {
    try { parsed = fn(); if (Array.isArray(parsed)) break } catch { /**/ }
  }

  return NextResponse.json({ transactions: Array.isArray(parsed) ? parsed : [] })
}
