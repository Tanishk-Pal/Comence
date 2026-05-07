import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message;

    if (!message) {
      return NextResponse.json({
        reply: "No message provided",
      });
    }

    // ---------------- GROQ ----------------

    try {
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content:
                  "You are Tanx AI, a smart ecommerce assistant helping users with shopping, products, casual conversation and recommendations.",
              },
              {
                role: "user",
                content: message,
              },
            ],
          }),
        }
      );

      const groqData = await groqRes.json();

      console.log("Groq Response:", groqData);

      if (groqData?.choices?.[0]?.message?.content) {
        return NextResponse.json({
          reply: groqData.choices[0].message.content,
        });
      }

      throw new Error("Groq failed");
    } catch (err) {
      console.log("Groq failed. Switching to OpenRouter...");
    }

    // ---------------- OPENROUTER BACKUP ----------------

    try {
      const openrouterRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are Tanx AI, a smart ecommerce assistant.",
              },
              {
                role: "user",
                content: message,
              },
            ],
          }),
        }
      );

      const openrouterData = await openrouterRes.json();

      console.log("OpenRouter Response:", openrouterData);

      if (openrouterData?.choices?.[0]?.message?.content) {
        return NextResponse.json({
          reply: openrouterData.choices[0].message.content,
        });
      }

      throw new Error("OpenRouter failed");
    } catch (err) {
      console.log("OpenRouter also failed");
    }

    return NextResponse.json({
      reply: "All AI providers failed.",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json({
      reply: "Server error",
    });
  }
}