const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
});

const getOutputUrl = (output: unknown): string | null => {
    if (typeof output === "string") return output;
    if (Array.isArray(output)) {
        const firstUrl = output.find(item => typeof item === "string");
        return typeof firstUrl === "string" ? firstUrl : null;
    }
    if (output && typeof output === "object") {
        const candidate = output as Record<string, unknown>;
        for (const key of ["url", "image", "output"]) {
            const value = candidate[key];
            if (typeof value === "string") return value;
        }
    }
    return null;
};

const waitForPrediction = async (predictionUrl: string, token: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await fetch(predictionUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const prediction = await response.json();
        if (!response.ok) throw new Error(prediction.detail || prediction.error || "Replicate sonucu okunamadı.");
        if (prediction.status === "succeeded") return prediction;
        if (["failed", "canceled"].includes(prediction.status)) {
            throw new Error(prediction.error || `Replicate işlemi ${prediction.status} durumunda.`);
        }
    }
    throw new Error("Replicate işlemi zaman aşımına uğradı.");
};

Deno.serve(async request => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse({ error: "Sadece POST desteklenir." }, 405);

    const token = Deno.env.get("REPLICATE_API_KEY");
    const modelVersion = Deno.env.get("REPLICATE_MODEL_VERSION");
    if (!token || !modelVersion) {
        return jsonResponse({ error: "REPLICATE_API_KEY veya REPLICATE_MODEL_VERSION secret tanımlı değil." }, 500);
    }

    try {
        const body = await request.json();
        const roomImage = body.room_image;
        const productImage = body.product_image;
        if (typeof roomImage !== "string" || typeof productImage !== "string") {
            return jsonResponse({ error: "room_image ve product_image zorunludur." }, 400);
        }

        const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: modelVersion,
                input: {
                    image: roomImage,
                    product_image: productImage,
                    prompt: "Place this rug naturally on the visible floor, preserving the room perspective, lighting, furniture, and shadows."
                }
            })
        });
        const prediction = await predictionResponse.json();
        if (!predictionResponse.ok) {
            return jsonResponse({ error: prediction.detail || prediction.error || "Replicate prediction başlatılamadı.", details: prediction }, predictionResponse.status);
        }

        const completedPrediction = prediction.status === "succeeded"
            ? prediction
            : await waitForPrediction(prediction.urls.get, token);
        const outputUrl = getOutputUrl(completedPrediction.output);
        if (!outputUrl) return jsonResponse({ error: "Replicate çıktı URL'si döndürmedi.", details: completedPrediction }, 502);

        return jsonResponse({ output_url: outputUrl, prediction_id: completedPrediction.id });
    } catch (error) {
        console.error("virtual-try-on Edge Function hatası:", error);
        return jsonResponse({ error: error instanceof Error ? error.message : "Sanal giydirme başarısız." }, 500);
    }
});
