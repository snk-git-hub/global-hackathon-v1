import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { imageData, prompt } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'No imageData provided' },
        { status: 400 }
      );
    }

    const baseInstructions = `
You are an expert in vision, math, science, handwriting, code, and analysis. Carefully examine the visual content provided and respond based on what it shows:
- If it contains written text: summarize or interpret it.
- If it includes a math problem: provide only the final answer. If something is unclear, ask a precise question.
- If it's a chart or graph: explain the key trends or data insights.
- If it shows a diagram: describe the components and what they represent.
- If it contains handwriting: transcribe it clearly.
- If it's code: explain what it does or debug it.
- If it's a visual scene: describe it clearly.
- If it includes a question (e.g., ending with '?' or '='), provide only the answer.

Be concise and accurate. Provide direct results where possible. Ask for clarification only if absolutely necessary.
    `.trim();

    const fullPrompt = prompt
      ? `${baseInstructions}\n\nUser's specific request: ${prompt}`
      : baseInstructions;

    // Remove the data URL prefix to get just the base64 data
    const base64Data = imageData.split(',')[1];

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Create the image part
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/png',
      },
    };

    // Generate content
    const result = await model.generateContent([fullPrompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
}

// Enable CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}