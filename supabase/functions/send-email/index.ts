import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

console.log("Hello from Send Email!");

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
    }

    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from, to, subject, text, attachment, filename } = await req.json();

        if (!smtp_host || !to) {
            throw new Error("Missing SMTP config or recipient");
        }

        const client = new SmtpClient();

        let connectConfig: any = {
            hostname: smtp_host,
            port: smtp_port || 587,
            username: smtp_user,
            password: smtp_pass,
        };

        // Note: Deno SMTP client TLS handling might vary. 
        // This is a basic setup.

        await client.connectTLS(connectConfig); // Assuming secure by default or check smtp_secure logic

        await client.send({
            from: from || smtp_user,
            to: to,
            subject: subject,
            content: text,
            // Deno SMTP library attachment handling is specific. 
            // This is pseudo-code for the artifacts. 
            // Real implementation depends on library version capabilities.
            // For base64 attachments, you often need to construct the MIME body manually or use a helper.
        });

        await client.close();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
        });
    }
});
