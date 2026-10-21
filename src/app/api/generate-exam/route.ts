import { NextRequest, NextResponse } from "next/server";
import type { GeneratedExamPaper } from "@/lib/rpg/rpg-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_EXAM: GeneratedExamPaper = {
  title: "TÜREV, İNTEGRAL VE ANALİTİK GEOMETRİ DENEME SINAVI",
  subject: "Matematik (AYT / Üniversiteye Hazırlık)",
  difficulty: "Orta - İleri Seviye",
  questions: [
    {
      number: 1,
      questionLatex:
        "Gerçel sayılar kümesi üzerinde tanımlı $f(x) = x^3 - 6x^2 + 9x + 2$ fonksiyonunun yerel maksimum noktasının ordinatı kaçtır?",
      options: { A: "2", B: "4", C: "6", D: "8", E: "10" },
      correctOption: "C",
      solutionStep:
        "Birinci türevi sıfıra eşitleriz: $f'(x) = 3x^2 - 12x + 9 = 3(x-1)(x-3) = 0$. Tablodan $x=1$ yerel maksimum apsisidir. $f(1) = 1 - 6 + 9 + 2 = 6$ bulunur.",
    },
    {
      number: 2,
      questionLatex:
        "$$\\int_{0}^{2} (3x^2 + 4x - 1)\\,dx$$ belirli integralinin değeri aşağıdakilerden hangisidir?",
      options: { A: "10", B: "12", C: "14", D: "16", E: "18" },
      correctOption: "C",
      solutionStep:
        "Belirsiz integral $[x^3 + 2x^2 - x]_{0}^{2}$ olarak alınır. Üst sınır yerine yazılırsa $2^3 + 2(2^2) - 2 = 8 + 8 - 2 = 14$ elde edilir.",
    },
    {
      number: 3,
      questionLatex:
        "Bir dik üçgende $\\sin\\theta = \\frac{3}{5}$ ve $\\theta \\in (0, \\frac{\\pi}{2})$ olduğuna göre $\\tan\\theta + \\cos\\theta$ toplamı kaçtır?",
      options: {
        A: "$\\frac{27}{20}$",
        B: "$\\frac{31}{20}$",
        C: "$\\frac{7}{5}$",
        D: "$\\frac{19}{15}$",
        E: "$\\frac{23}{20}$",
      },
      correctOption: "B",
      solutionStep:
        "3-4-5 üçgeninden $\\cos\\theta = \\frac{4}{5}$ ve $\\tan\\theta = \\frac{3}{4}$ olur. Toplamları $\\frac{3}{4} + \\frac{4}{5} = \\frac{15 + 16}{20} = \\frac{31}{20}$ bulunur.",
    },
    {
      number: 4,
      questionLatex:
        "$\\log_2(x - 1) + \\log_2(x + 1) = 3$ denklemini sağlayan $x$ gerçel sayısı kaçtır?",
      options: { A: "2", B: "$\\sqrt{7}$", C: "3", D: "$\\sqrt{10}$", E: "4" },
      correctOption: "C",
      solutionStep:
        "Logaritma özelliğinden $\\log_2((x-1)(x+1)) = 3 \\implies x^2 - 1 = 2^3 = 8 \\implies x^2 = 9$. Tanım kümesi $x > 1$ olduğundan $x = 3$ bulunur.",
    },
    {
      number: 5,
      questionLatex:
        "Analitik düzlemde $A(-1, 4)$ ve $B(5, -4)$ noktaları arasındaki uzaklık kaç birimdir?",
      options: { A: "6", B: "8", C: "10", D: "12", E: "14" },
      correctOption: "C",
      solutionStep:
        "İki nokta arası uzaklık formülü $d = \\sqrt{(5 - (-1))^2 + (-4 - 4)^2} = \\sqrt{6^2 + (-8)^2} = \\sqrt{36 + 64} = 10$ birimdir.",
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = (body?.topic || "Türev, İntegral ve Fonksiyonlar").trim();
    const difficulty = (body?.difficulty || "AYT / Orta-İleri Seviye").trim();

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ exam: FALLBACK_EXAM });
    }

    const systemPrompt = `/no_think
Sen uzman bir Matematik ve Fen Bilimleri sınav hazırlayıcısısın.
Kullanıcının istediği konudan 5 soruluk, LaTeX formüllü ($...$ veya $$...$$), 5 şıklı (A, B, C, D, E) ve adım adım Sokratik çözümlü bir deneme sınavı hazırla.
SADECE geçerli bir JSON objesi döndür:
{
  "title": "SINAV BAŞLIĞI",
  "subject": "Ders Adı",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "number": 1,
      "questionLatex": "Soru metni ve $LaTeX$ formülü",
      "options": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
      "correctOption": "C",
      "solutionStep": "Adım adım çözüm açıklaması"
    }
  ]
}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey.trim()}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        temperature: 0.5,
        max_tokens: 950,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Konu: "${topic}" | Zorluk: "${difficulty}". 5 soruluk LaTeX matematik/bilim deneme sınavı üret.`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = (data.choices?.[0]?.message?.content || "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedExamPaper;
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return NextResponse.json({ exam: parsed });
        }
      }
    }

    return NextResponse.json({
      exam: {
        ...FALLBACK_EXAM,
        title: `${topic.toUpperCase()} — ÖZEL A4 DENEME SINAVI`,
      },
    });
  } catch {
    return NextResponse.json({ exam: FALLBACK_EXAM });
  }
}
