import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '35mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'makan_db.json');

interface PersistentStore {
  projects: any[];
  customPrices: any[];
}

function loadStore(): PersistentStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial: PersistentStore = { projects: [], customPrices: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as PersistentStore;
  } catch (err) {
    console.error('Error loading persistent store:', err);
    return { projects: [], customPrices: [] };
  }
}

function saveStore(store: PersistentStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persistent store:', err);
  }
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// --- API: Persistent Projects ---
app.get('/api/projects', (_req, res) => {
  const store = loadStore();
  res.json({ projects: store.projects });
});

app.post('/api/projects', (req, res) => {
  const store = loadStore();
  const project = req.body.project;
  if (!project || !project.id) {
    res.status(400).json({ error: 'بيانات المشروع غير مكتملة' });
    return;
  }
  const idx = store.projects.findIndex((p: any) => p.id === project.id);
  if (idx >= 0) {
    store.projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    store.projects.unshift({ ...project, updatedAt: new Date().toISOString() });
  }
  saveStore(store);
  res.json({ ok: true, project });
});

app.delete('/api/projects/:id', (req, res) => {
  const store = loadStore();
  store.projects = store.projects.filter((p: any) => p.id !== req.params.id);
  saveStore(store);
  res.json({ ok: true });
});

// --- API: Persistent Custom Prices ---
app.get('/api/prices', (_req, res) => {
  const store = loadStore();
  res.json({ customPrices: store.customPrices });
});

app.post('/api/prices', (req, res) => {
  const store = loadStore();
  const priceRecord = req.body.priceRecord;
  if (!priceRecord || !priceRecord.id) {
    res.status(400).json({ error: 'بيانات السعر غير مكتملة' });
    return;
  }
  const idx = store.customPrices.findIndex((p: any) => p.id === priceRecord.id);
  if (idx >= 0) {
    store.customPrices[idx] = priceRecord;
  } else {
    store.customPrices.unshift(priceRecord);
  }
  saveStore(store);
  res.json({ ok: true, priceRecord });
});

// --- API: Smart Room Image Analysis (Gemini Vision - Free Tier Compatible) ---
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { imageDataUrl, roomTypeHintAr } = req.body;
    const ai = getGenAIClient();

    if (!ai || !imageDataUrl) {
      res.status(200).json({
        aiPowered: false,
        message: 'تم استخدام المحلل الهندسي المحلي',
      });
      return;
    }

    const matches = imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'صيغة الصورة غير صالحة' });
      return;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const promptText = `أنت مهندس معماري ومصمم داخلي خبير في السوق المصري لمنصة "مكان AI".
قم بتحليل صورة هذه المساحة الداخلية بدقة بالغة باللغة العربية.
نوع المكان المقترح من المستخدم: ${roomTypeHintAr || 'غير محدد'}.

يجب الفصل تماماً بين:
1. المعلومات المرئية المؤكدة فعلياً في الصورة (نوع المكان المحتمل، حالة التشطيب الحالية، الأثاث الظاهر، ألوان وحالة الحوائط والأرضيات، مصادر الإضاءة الظاهرة، العناصر المعمارية الثابتة مثل الأبواب والشبابيك والأعمدة والكمرات).
2. التقديرات والمقترحات غير المؤكدة (الأولويات المقترحة للتجديد، الأنماط المناسبة، نصائح تنسيق الألوان).
تنبيه هام: لا تدّعِ معرفة المقاسات الهندسية الحقيقية بالمتر من الصورة لأنها تتطلب رفع مقاسات فعلي بالمتر في الموقع.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probableRoomTypeAr: { type: Type.STRING },
            finishConditionAr: { type: Type.STRING },
            visibleFurnitureAr: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            wallColorsAndStateAr: { type: Type.STRING },
            floorMaterialAndStateAr: { type: Type.STRING },
            visibleLightingAr: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            architecturalElementsAr: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            renovationPrioritiesAr: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedStyleIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            colorHarmonyAdviceAr: { type: Type.STRING },
            measurementDisclaimerAr: { type: Type.STRING },
          },
          required: [
            'probableRoomTypeAr',
            'finishConditionAr',
            'visibleFurnitureAr',
            'wallColorsAndStateAr',
            'floorMaterialAndStateAr',
            'visibleLightingAr',
            'architecturalElementsAr',
            'renovationPrioritiesAr',
            'recommendedStyleIds',
            'colorHarmonyAdviceAr',
            'measurementDisclaimerAr',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      aiPowered: true,
      analysis: {
        analyzedAt: new Date().toLocaleTimeString('ar-EG'),
        aiPowered: true,
        confirmedVisible: {
          probableRoomTypeAr: parsed.probableRoomTypeAr || roomTypeHintAr || 'مساحة داخلية',
          finishConditionAr: parsed.finishConditionAr || 'جاهز للتطوير والتجديد',
          visibleFurnitureAr: parsed.visibleFurnitureAr || [],
          wallColorsAndStateAr: parsed.wallColorsAndStateAr || 'حوائط قابلة للتشطيب',
          floorMaterialAndStateAr: parsed.floorMaterialAndStateAr || 'أرضية قابلة للتحديث',
          visibleLightingAr: parsed.visibleLightingAr || ['إضاءة محيطة'],
          architecturalElementsAr: parsed.architecturalElementsAr || ['فتحات معمارية قياسية'],
        },
        estimatedInsights: {
          renovationPrioritiesAr: parsed.renovationPrioritiesAr || [
            'تحديث دهانات الحوائط وتنسيقها مع الأرضية',
            'توزيع الإضاءة المخفية والسبوتات لإبراز المساحة',
          ],
          recommendedStyleIds: parsed.recommendedStyleIds || ['neoclassic', 'modern', 'minimal'],
          colorHarmonyAdviceAr:
            parsed.colorHarmonyAdviceAr ||
            'يفضل اعتماد درجات الجريج الدافئ مع أرضيات البورسلين أو الرخام البيج لتوسيع الإحساس بالمساحة.',
          measurementDisclaimerAr:
            parsed.measurementDisclaimerAr ||
            'المعلومات أعلاه مبنية على التحليل البصري للصورة فقط. المقاسات الفعلية بالمتر المربع تتطلب قياساً ميدانياً ولا يمكن تأكيدها من صورة عادية دون مرجع قياس موثوق.',
        },
      },
    });
  } catch (err: any) {
    console.warn('Gemini vision analysis fallback triggered:', err?.message || err);
    res.status(200).json({
      aiPowered: false,
      error: err?.message || 'تعذر الاتصال بنموذج الرؤية، تم التبديل للتحليل الهندسي الذكي',
    });
  }
});

// --- API: Design & Image Generation / Guidance ---
app.post('/api/ai/design', async (req, res) => {
  try {
    const {
      imageDataUrl,
      promptDescriptionAr,
      preserveArchitecture,
      mode,
    } = req.body;

    const ai = getGenAIClient();
    if (!ai || !imageDataUrl) {
      res.status(200).json({
        aiImageGenerated: false,
        aiNotesAr:
          'تم تطبيق الخامات والألوان المختارة مع الحفاظ التام على أبعاد الغرفة ومواضع الأبواب والشبابيك.',
      });
      return;
    }

    const matches = imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'صيغة الصورة غير صالحة' });
      return;
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    // Step 1: Try gemini-3.1-flash-lite-image if quota allows
    try {
      const imageEditPrompt = `You are MAKAN AI, an architectural interior design engine.
Edit this interior room photo according to these exact user specifications:
${promptDescriptionAr}
CRITICAL RULES:
- Keep the exact camera angle, room perspective, and architectural geometry.
- ${preserveArchitecture ? 'DO NOT move, remove, or alter any doors, windows, structural columns, or room boundaries.' : 'Preserve main room proportions.'}
- ${mode === 'element_mask' ? 'ONLY modify the explicitly specified element(s). Keep all other surfaces, furniture, walls, and flooring untouched.' : 'Ensure harmonious interior design matching the selected finishes.'}`;

      const imgResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: imageEditPrompt },
          ],
        },
      });

      const parts = imgResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          res.json({
            aiImageGenerated: true,
            resultDataUrl: `data:${outMime};base64,${part.inlineData.data}`,
            aiNotesAr:
              'تم توليد التصميم بالذكاء الاصطناعي مع الحفاظ على الهيكل المعماري للمكان وفتحات الأبواب والشبابيك.',
          });
          return;
        }
      }
    } catch (_imgErr) {
      // Expected when user is on free tier without paid image model quota; proceed to Gemini 3.8 Flash architectural guidance + client photometric engine
    }

    // Step 2: Use free-tier gemini-3.8-flash to provide tailored architectural & material notes for this exact photo + design
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `أنت مهندس تصميم داخلي في منصة "مكان AI".
المستخدم قام بتطبيق التعديلات التالية على هذه الغرفة:
${promptDescriptionAr}
اكتب ملاحظة هندسية موجزة ومفيدة (في جملتين فقط باللغة العربية) تشرح كيف تتناسق هذه الاختيارات (الألوان، الخامات، الإضاءة) مع إضاءة وهندسة هذه الغرفة في الصورة، مع تأكيد الحفاظ على العناصر المعمارية الثابتة.`,
          },
        ],
      },
    });

    res.json({
      aiImageGenerated: false,
      aiNotesAr:
        textResponse.text?.trim() ||
        'تم تطبيق الخامات والألوان المختارة بدقة مع الحفاظ على أبعاد المكان والأبواب والشبابيك.',
    });
  } catch (err: any) {
    res.status(200).json({
      aiImageGenerated: false,
      aiNotesAr:
        'تم تطبيق الخامات والتشطيبات المختارة على المساحة مع الحفاظ على ثبات العناصر المعمارية.',
    });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAKAN AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
