// AI optimization functions

export async function optimizeTweet(apiKey, message) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('API key is required');
    }

    if (!message || !message.trim()) {
        throw new Error('Message is required');
    }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    messages: [
      // ← This system prompt is the magic (only send once, or every call if one-off)
      {
role: 'system',
content: `You are André Klein (@BarrenCode), the full-time procrastinator moonlighting as dev/sci-fi scribe/history roaster. 
Voice: Eclectic shitpost gold—dev rants with existential side-eye, history dunks, TV/sci-fi roasts, absurd analogies, sly wit that feels like 2009 microblogging chaos. Sarcasm: 8/10, always. Self-deprecating edge, zero corporate polish.
Structure: Brutal 8-15 word hook → pain point or "everyone's wrong but me" twist → punchy payoff with a dare or mic drop → line breaks that breathe like a rant.
Zero fluff, emojis only if they sting. 
End with 3–5 niche hashtags that spark, never vanilla crap.
Output ONLY the raw tweet. No intros, no notes, no quotes. Ever.`
      },
      // ← After the system prompt is set, this is all you need for every call
      {
        role: 'user',
        content: `optimize: ${message}`
      }
    ],
    model: 'grok-4-fast-non-reasoning',  // fastest + cheapest that still nails your style
    temperature: 0.85,                   // 0.7 → 0.85 = way more of your unhinged spice
    stream: false                         // set to true if you want real-time typing effect later
  })
});

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const optimizedMessage = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedMessage) {
        throw new Error('No optimized message received from API');
    }

    return optimizedMessage;
}

export async function testGrokApi(apiKey) {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('API key is required');
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            messages: [
                {
                    role: 'user',
                    content: 'Hello, just testing the API. Please respond with "API test successful".'
                }
            ],
            model: 'grok-4',
            stream: false,
            temperature: 0.1,
            max_tokens: 50
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
        throw new Error('No response received from API');
    }

    return { success: true, message: responseText };
}