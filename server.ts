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

    let mimeType = 'image/jpeg';
    let base64Data = '';
    const matches = imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('/images/')) {
      const localPath = path.join(process.cwd(), 'public', imageDataUrl);
      if (fs.existsSync(localPath)) {
        base64Data = fs.readFileSync(localPath).toString('base64');
      } else {
        res.status(200).json({ aiPowered: false });
        return;
      }
    } else {
      res.status(200).json({ aiPowered: false });
      return;
    }

    const promptText = `أنت مهندس معماري ومصمم داخلي خبير في السوق المصري لمنصة "مكان AI".
قم بتحليل صورة هذه المساحة الداخلية بدقة بالغة باللغة العربية.
نوع المكان المقترح من المستخدم: ${roomTypeHintAr || 'غير محدد'}.

يجب الفصل تماماً بين:
1. المعلومات المرئية المؤكدة فعلياً في الصورة (نوع المكان المحتمل، حالة التشطيب الحالية، الأثاث الظاهر، ألوان وحالة الحوائط والأرضيات، مصادر الإضاءة الظاهرة، العناصر المعمارية الثابتة مثل الأبواب والشبابيك والأعمدة والكمرات).
2. التقديرات والمقترحات غير المؤكدة (الأولويات المقترحة للتجديد، الأنماط المناسبة، نصائح تنسيق الألوان).
تنبيه هام: لا تدّعِ معرفة المقاسات الهندسية الحقيقية بالمتر من الصورة لأنها تتطلب رفع مقاسات فعلي بالمتر في الموقع.`;

    const analysisSchema = {
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
        layoutAnalysisAr: { type: Type.STRING },
        strengthsAr: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        weaknessesAr: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        decorAdviceAr: { type: Type.STRING },
        palette: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              hex: { type: Type.STRING },
              use: { type: Type.STRING },
            },
            required: ['name', 'hex', 'use'],
          },
        },
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
        'layoutAnalysisAr',
        'strengthsAr',
        'weaknessesAr',
        'decorAdviceAr',
        'palette',
      ],
    };

    let responseText = '{}';
    const visionModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
    for (const modelName of visionModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
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
            responseSchema: analysisSchema,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (_modelErr) {
        // try next model in fallback list
      }
    }

    const parsed = JSON.parse(responseText || '{}');
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
          layoutAnalysisAr: parsed.layoutAnalysisAr || '',
          strengthsAr: parsed.strengthsAr || [],
          weaknessesAr: parsed.weaknessesAr || [],
          decorAdviceAr: parsed.decorAdviceAr || '',
          palette: parsed.palette || [],
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

// --- API: Design & Image Generation / Architectural Surface Guidance ---
app.post('/api/ai/design', async (req, res) => {
  try {
    const {
      imageDataUrl,
      promptDescriptionAr,
      preserveArchitecture,
      mode,
      compiledDirective,
      isCustomPhoto,
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

    let mimeType = 'image/jpeg';
    let base64Data = '';
    const matches = imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('/images/')) {
      const localPath = path.join(process.cwd(), 'public', imageDataUrl);
      if (fs.existsSync(localPath)) {
        base64Data = fs.readFileSync(localPath).toString('base64');
      } else {
        res.status(200).json({
          aiImageGenerated: false,
          aiNotesAr:
            'تم تطبيق الخامات والألوان المختارة مع الحفاظ التام على أبعاد الغرفة ومواضع الأبواب والشبابيك.',
        });
        return;
      }
    } else {
      res.status(200).json({
        aiImageGenerated: false,
        aiNotesAr:
          'تم تطبيق الخامات والألوان المختارة مع الحفاظ التام على أبعاد الغرفة ومواضع الأبواب والشبابيك.',
      });
      return;
    }

    const lockSection =
      compiledDirective?.systemArchitecturalLockPrompt ||
      `STRICT ARCHITECTURAL IMAGE-TO-IMAGE SURFACE EDITING:\n- Keep the exact camera angle, room perspective, and architectural geometry.\n- ${
        preserveArchitecture
          ? 'DO NOT move, remove, or alter any doors, windows, balconies, structural columns, or room boundaries.'
          : 'Preserve main room proportions.'
      }`;
    const surfaceSection =
      compiledDirective?.compiledSurfaceDirectiveEn || promptDescriptionAr || '';
    const contextSectionAr =
      compiledDirective?.compiledContextAr || promptDescriptionAr || '';

    // Step 1: Try gemini-2.5-flash-image ONLY for custom user photos that don't have a verified 3D master
    if (isCustomPhoto) {
      try {
        const imageEditPrompt = `You are MAKAN AI, an architectural interior design engine.\n${lockSection}\n\nSURFACE EXECUTION DIRECTIVES:\n${surfaceSection}\n- ${
          mode === 'element_mask'
            ? 'ONLY modify the explicitly specified element(s). Keep all other surfaces, furniture, walls, and flooring 100% untouched.'
            : 'Ensure harmonious photorealistic interior finishes while keeping all doors and windows untouched.'
        }`;

        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
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
        // Proceed to Gemini Vision architectural segmentation + notes
      }
    }

    // Step 2: Use Free-Tier Gemini Vision (gemini-3.1-flash-lite / gemini-3.8-flash) to extract exact room surface boundaries & protected openings
    const segSchema = {
      type: Type.OBJECT,
      properties: {
        ceilingBottomY: {
          type: Type.NUMBER,
          description: 'Normalized Y (0.12 to 0.36) where the ceiling meets the main back wall',
        },
        floorTopY: {
          type: Type.NUMBER,
          description: 'Normalized Y (0.64 to 0.92) where the main back wall meets the floor',
        },
        isUnfinished: {
          type: Type.BOOLEAN,
          description: 'True if the room has unpainted gray plaster, red brick, or raw concrete surfaces',
        },
        protectedOpenings: {
          type: Type.ARRAY,
          description: 'Bounding boxes (normalized 0.0 to 1.0) of all doors, windows, balconies, and large furniture that must not be painted over',
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              ymin: { type: Type.NUMBER },
              xmin: { type: Type.NUMBER },
              ymax: { type: Type.NUMBER },
              xmax: { type: Type.NUMBER },
            },
            required: ['label', 'ymin', 'xmin', 'ymax', 'xmax'],
          },
        },
        aiNotesAr: {
          type: Type.STRING,
          description: 'Two concise sentences in Arabic explaining how the selected finishes fit this room while preserving doors and windows',
        },
      },
      required: ['ceilingBottomY', 'floorTopY', 'isUnfinished', 'protectedOpenings', 'aiNotesAr'],
    };

    const segPrompt = `أنت محرك الرؤية المعمارية في منصة "مكان AI".
الأوامر المجمعة لتشطيب هذه الغرفة:
${contextSectionAr}

المطلوب:
1. حدد الإحداثيات النسبية (من 0.0 إلى 1.0) لخط التقاء السقف بالحائط الخلفي (ceilingBottomY) وخط التقاء الحائط الخلفي بالأرضية (floorTopY).
2. حدد صناديق الإحاطة (protectedOpenings) لكل الأبواب والشبابيك والبلكونات والأثاث الرئيسي في الصورة بدقة حتى يحافظ عليها المحرك المعماري بنسبة 100% ولا يطمسها.
3. اكتب ملاحظة هندسية موجزة (aiNotesAr) في جملتين باللغة العربية تشرح تناغم الألوان والخامات المختارة مع إضاءة وهندسة هذه الغرفة مع تأكيد الحفاظ على الأبواب والشبابيك.`;

    let segResult: any = null;
    for (const modelName of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
      try {
        const textResponse = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: segPrompt },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: segSchema,
          },
        });
        if (textResponse.text) {
          segResult = JSON.parse(textResponse.text);
          break;
        }
      } catch (_segErr) {
        // try next fallback model
      }
    }

    res.json({
      aiImageGenerated: false,
      roomSegmentation: segResult
        ? {
            ceilingBottomY: segResult.ceilingBottomY,
            floorTopY: segResult.floorTopY,
            isUnfinished: segResult.isUnfinished,
            protectedOpenings: segResult.protectedOpenings || [],
          }
        : undefined,
      aiNotesAr:
        segResult?.aiNotesAr ||
        'تم تطبيق الخامات والألوان المختارة بدقة مع الحفاظ على أبعاد المكان والأبواب والشبابيك.',
    });
  } catch (_err: any) {
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
