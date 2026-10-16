import dotenv from "dotenv";
dotenv.config();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Validates the raw JSON output from the AI.
 * Ensures the structure matches the requirement.
 */
function validateAIResponse(data, expectedCount) {
  if (!data || !Array.isArray(data.questions)) {
    throw new Error("Invalid response structure: 'questions' array is missing.");
  }

  if (data.questions.length !== Number(expectedCount)) {
    console.warn(`Warning: Expected ${expectedCount} questions, got ${data.questions.length}`);
    // We can still return them, but maybe throw if we strictly want exact
    // the prompt said "exact requested number of questions"
    if (data.questions.length === 0) {
      throw new Error("No questions generated.");
    }
  }

  // Validate each question
  const validatedQuestions = data.questions.map((q, index) => {
    if (!q.question || typeof q.question !== "string" || q.question.trim() === "") {
      throw new Error(`Question ${index + 1} has an invalid or empty 'question' field.`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${index + 1} must have exactly 4 options.`);
    }
    q.options.forEach((opt, oIndex) => {
      if (!opt || typeof opt !== "string" || opt.trim() === "") {
        throw new Error(`Option ${oIndex + 1} of question ${index + 1} is empty.`);
      }
    });
    if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
      throw new Error(`Question ${index + 1} is missing a correct answer.`);
    }
    if (!q.options.includes(q.correctAnswer)) {
      throw new Error(`Correct answer for question ${index + 1} must exactly match one of its options.`);
    }
    if (!q.marks || isNaN(q.marks) || q.marks <= 0) {
      throw new Error(`Question ${index + 1} must have a positive marks value.`);
    }
    if (!q.difficulty) q.difficulty = "medium";
    if (!q.topic) q.topic = "General";

    return {
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctAnswer: q.correctAnswer.trim(),
      marks: Number(q.marks),
      difficulty: q.difficulty.trim(),
      topic: q.topic.trim(),
    };
  });

  return validatedQuestions;
}

/**
 * Calls Groq API with retries
 */
export async function groqCompletionWithRetry(systemPrompt, userPrompt, expectedCount, maxRetries = 2) {
  let attempt = 0;
  
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b", // Using available model via your API key
          response_format: { type: "json_object" }, 
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 900,
        }),
      });

      if (!response.ok) {
        let errorText = "";
        try { errorText = await response.text(); } catch(e) {}
        throw new Error(`Groq API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const rawResponse = await response.json();
      const content = rawResponse.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty content received from AI.");
      }

      // Sometimes models wrap JSON in markdown block even with response_format flag
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.substring(7);
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.substring(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
      }
      cleanedContent = cleanedContent.trim();

      const parsedJSON = JSON.parse(cleanedContent);
      const validated = validateAIResponse(parsedJSON, expectedCount);
      
      return validated;
      
    } catch (error) {
      console.error(`Groq Attempt ${attempt} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        throw new Error(`AI Validation Failed: ${error.message}`);
      }
    }
  }
}

/** Generate a bounded reviewer narrative from backend-verified records only. */
export async function explainProctoringReview(reportFacts) {
  if (!process.env.GROQ_API_KEY) return "";
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: "Write a concise, neutral exam-review explanation using only the supplied JSON facts. Do not infer cheating, invent details, timestamps, confidence, or evidence. Explain the stored policy decisions and score. Clearly distinguish warning, review required, confirmed violations, and actual termination. State that uncertain events did not receive penalties. Return plain text only." },
        { role: "user", content: JSON.stringify(reportFacts) },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Groq review explanation failed (${response.status})`);
  const data = await response.json();
  return String(data.choices?.[0]?.message?.content || "").trim().slice(0, 2000);
}
