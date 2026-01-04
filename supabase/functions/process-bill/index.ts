
// Supabase Edge Function: process-bill
// Uses Gemini 2.5 Flash. NO external dependencies.
// AUTH: Uses x-goog-api-key header.
// MODEL: gemini-2.5-flash

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Validate Configuration
        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: "Configuration Error: GEMINI_API_KEY is missing." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 3. Parse Request Body
        let body;
        try {
            const text = await req.text();
            if (!text || text.trim() === "") throw new Error("Empty body");
            body = JSON.parse(text);
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON body provided." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const { image } = body;
        if (!image) {
            return new Response(JSON.stringify({ error: "No image data provided in payload." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 4. Construct Gemini Prompt
        const prompt = `
            Extract invoice data into this JSON structure:
            {
                "vendor_name": "Supplier Name",
                "bill_number": "Bill ID",
                "total_amount": 0.00,
                "date": "YYYY-MM-DD",
                "items": [
                    { "description": "item", "quantity": 1, "unit_price": 0.00, "amount": 0.00 }
                ]
            }
            Use 0 or "" if missing.
        `;

        // 5. Call Gemini API
        const geminiRes = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: image } }
                    ]
                }],
                generationConfig: { response_mime_type: "application/json" }
            }),
        });

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            return new Response(JSON.stringify({
                error: `Gemini Provider Error: ${geminiRes.status}`,
                details: errorText
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const result = await geminiRes.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return new Response(JSON.stringify({ error: "AI could not extract text from this image." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 6. Clean and Return Data
        const cleanText = text.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
        const data = JSON.parse(cleanText);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
