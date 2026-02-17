import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stickers, projects, users, existing_tasks } = await req.json();

    if (!stickers?.length) {
      return new Response(JSON.stringify({ error: "No stickers provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const projectList = (projects || [])
      .map((p: any) => `- ID: ${p.id} | Name: "${p.name}" | Job#: ${p.job_number}`)
      .join("\n");

    const userList = (users || [])
      .map((u: any) => `- ID: ${u.id} | Name: "${u.name}"`)
      .join("\n");

    const existingTaskList = (existing_tasks || [])
      .map((t: any) => `- "${t.description}" (project: ${t.project_id}, start: ${t.start_date || 'none'}, end: ${t.end_date || 'none'})`)
      .join("\n");

    const stickerTexts = stickers
      .map((s: any, i: number) => `[Sticker ${i + 1}] (project: ${s.project_name || "none"}, created: ${s.created_at || "unknown"})\n${s.content}`)
      .join("\n---\n");

    const systemPrompt = `You are a project management assistant. Analyze sticker notes and extract actionable items.

Available projects:
${projectList || "(none)"}

Available team members:
${userList || "(none)"}

Today's date: ${new Date().toISOString().slice(0, 10)}

Already existing tasks in the system:
${existingTaskList || "(none)"}

Rules:
- Extract deadlines (dates mentioned), tasks (action items), and assigned persons.
- Match to existing projects and users by name when possible.
- For dates, use YYYY-MM-DD format. Interpret relative dates from today.
- If no project match, set project_id to null.
- If no user match, set user_id to null but keep the person's name in assigned_person_name.
- Each extracted item should reference which sticker it came from.
- Be conservative: only extract clear, actionable items. Don't invent data.
- For tasks: extract start_date and end_date when possible.
  - If the sticker mentions a submission date, due date, or deadline for a task, use it as end_date.
  - If the sticker mentions a start date, use it as start_date.
  - If no start date is mentioned, leave start_date as null (the system will default to sticker creation date).
  - If no end/due date is mentioned, leave end_date as null.

IMPORTANT - Repeating deadlines:
- When text mentions recurring patterns like "Every week", "Every Monday", "Bi-weekly", "Monthly", etc., you MUST expand them into MULTIPLE individual deadline entries.
- For "Every week" or "Every Monday" type patterns: generate individual deadline entries for at least the next 4 weeks (or the number specified).
- For "Every month" type patterns: generate individual deadline entries for the next 3 months (or the number specified).
- Each expanded deadline must have its own specific date in YYYY-MM-DD format.
- Example: "Submit report every Monday" → 4 separate deadlines for the next 4 Mondays.
- If a range is specified (e.g., "Every Monday from Jan to March"), generate deadlines for that entire range.

IMPORTANT - Existing task awareness:
- Compare your extracted tasks against the "Already existing tasks" list above.
- For each extracted task, set is_existing to true if a task with the same or very similar description already exists for the same project.
- Two tasks are "the same" if their descriptions convey the same action/intent, even if worded slightly differently (e.g., "Review design docs" and "Review the design documents" are the same task).
- If the task already exists but you found NEW date information (start_date or end_date that the existing task doesn't have), set has_new_dates to true.`;

    const userPrompt = `Analyze these stickers and extract deadlines, tasks, and assigned persons:\n\n${stickerTexts}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_items",
              description: "Extract deadlines, tasks, and assigned persons from sticker notes.",
              parameters: {
                type: "object",
                properties: {
                  deadlines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Deadline description" },
                        date: { type: "string", description: "YYYY-MM-DD format" },
                        project_id: { type: "string", description: "Matched project ID or null" },
                        project_name: { type: "string", description: "Project name for display" },
                        source_sticker_index: { type: "number", description: "1-based sticker index" },
                      },
                      required: ["name", "date", "source_sticker_index"],
                      additionalProperties: false,
                    },
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Task description" },
                        project_id: { type: "string", description: "Matched project ID or null" },
                        project_name: { type: "string", description: "Project name for display" },
                        user_id: { type: "string", description: "Matched user ID or null" },
                        assigned_person_name: { type: "string", description: "Person name for display" },
                        source_sticker_index: { type: "number", description: "1-based sticker index" },
                        start_date: { type: "string", description: "YYYY-MM-DD start date or null" },
                        end_date: { type: "string", description: "YYYY-MM-DD end/due date or null" },
                        is_existing: { type: "boolean", description: "True if this task already exists in the system" },
                        has_new_dates: { type: "boolean", description: "True if existing task has new date info discovered" },
                      },
                      required: ["description", "source_sticker_index"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["deadlines", "tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ deadlines: [], tasks: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-stickers error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
