
// Supabase Edge Function: ai-insights
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
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Validate Config
        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: "Configuration Error: GEMINI_API_KEY is missing." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 3. Parse Body
        const text = await req.text();
        let body;
        try {
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const { dataSummary } = body;

        if (!dataSummary) {
            return new Response(JSON.stringify({ message: "AI Insights Ready. Please send dataSummary." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const prompt = `
            Analyze this business data:
            ${JSON.stringify(dataSummary)}

            Provide 3 actionable insights.
            Return ONLY JSON:
            {
                "overallStatus": "Healthy" | "Attention" | "Critical",
                "predictedCashFlow": "string",
                "insights": [
                    { "title": "string", "description": "string", "priority": "High" | "Medium" | "Low" }
                ]
            }
        `;

        // 4. Call Gemini
        const geminiRes = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
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
        const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!contentText) {
            return new Response(JSON.stringify({ error: "AI produced no insights." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const cleanText = contentText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
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
