import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getPromptService } from '@/lib/services/prompts/PromptService';
import { PROMPT_SERVICES } from '@/lib/models/Prompt';

/**
 * GET /api/prompts/[service]
 * Fetch prompts for a specific service (for mobile app usage)
 *
 * Query params:
 * - language: string (default: 'en')
 *
 * Returns:
 * - prompts: Record<string, { id, content, metadata }>
 * - version: string
 * - source: 'firestore' | 'yaml' | 'default'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    // Require authentication (but not admin)
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    // Validate service exists
    const validService = PROMPT_SERVICES.find(s => s.id === service);
    if (!validService) {
      return NextResponse.json(
        { error: `Unknown service: ${service}` },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Try to get config from Firestore
    const config = await promptService.getConfig(language, service);

    if (config && config.enabled && config.status === 'published') {
      // Return prompts from Firestore
      const simplifiedPrompts: Record<string, { id: string; content: string; metadata?: unknown }> = {};

      for (const [key, prompt] of Object.entries(config.prompts)) {
        simplifiedPrompts[key] = {
          id: prompt.id,
          content: prompt.content,
          metadata: prompt.metadata,
        };
      }

      return NextResponse.json({
        prompts: simplifiedPrompts,
        version: config.version,
        source: 'firestore',
        language,
      });
    }

    // Return default prompts if not in Firestore
    const defaultPrompts = getDefaultPrompts(service, language);

    if (defaultPrompts) {
      return NextResponse.json({
        prompts: defaultPrompts,
        version: '1.0.0',
        source: 'default',
        language,
      });
    }

    return NextResponse.json(
      { error: `No prompts found for service: ${service}` },
      { status: 404 }
    );
  } catch (error) {
    console.error('[API] Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// Carousel prompt translations for all 9 supported languages
const CAROUSEL_TRANSLATIONS: Record<string, { patterns: string; surprising: string; recommendation: string }> = {
  en: {
    patterns: 'Tell me one interesting insight about my recent activities and patterns. One sentence only.',
    surprising: 'What is one surprising thing about my data that I might not have noticed? One sentence only.',
    recommendation: 'Give me one personalized recommendation based on my recent behavior. One sentence only.',
  },
  es: {
    patterns: 'Cuéntame una observación interesante sobre mis actividades y patrones recientes. Solo una oración.',
    surprising: '¿Qué es algo sorprendente en mis datos que quizás no haya notado? Solo una oración.',
    recommendation: 'Dame una recomendación personalizada basada en mi comportamiento reciente. Solo una oración.',
  },
  fr: {
    patterns: 'Donne-moi une observation intéressante sur mes activités et habitudes récentes. Une seule phrase.',
    surprising: "Qu'y a-t-il de surprenant dans mes données que je n'aurais peut-être pas remarqué? Une seule phrase.",
    recommendation: 'Donne-moi une recommandation personnalisée basée sur mon comportement récent. Une seule phrase.',
  },
  de: {
    patterns: 'Sag mir eine interessante Erkenntnis über meine letzten Aktivitäten und Muster. Nur ein Satz.',
    surprising: 'Was ist etwas Überraschendes in meinen Daten, das ich vielleicht nicht bemerkt habe? Nur ein Satz.',
    recommendation: 'Gib mir eine personalisierte Empfehlung basierend auf meinem letzten Verhalten. Nur ein Satz.',
  },
  it: {
    patterns: 'Dimmi un\'osservazione interessante sulle mie attività e abitudini recenti. Solo una frase.',
    surprising: 'Qual è qualcosa di sorprendente nei miei dati che potrei non aver notato? Solo una frase.',
    recommendation: 'Dammi un consiglio personalizzato basato sul mio comportamento recente. Solo una frase.',
  },
  pt: {
    patterns: 'Conte-me uma observação interessante sobre minhas atividades e padrões recentes. Apenas uma frase.',
    surprising: 'O que é algo surpreendente nos meus dados que eu talvez não tenha percebido? Apenas uma frase.',
    recommendation: 'Dê-me uma recomendação personalizada baseada no meu comportamento recente. Apenas uma frase.',
  },
  zh: {
    patterns: '告诉我一个关于我最近活动和习惯的有趣见解。只用一句话。',
    surprising: '我的数据中有什么令人惊讶的地方是我可能没有注意到的？只用一句话。',
    recommendation: '根据我最近的行为给我一个个性化的建议。只用一句话。',
  },
  ja: {
    patterns: '最近の活動やパターンについて興味深い洞察を1つ教えてください。一文だけで。',
    surprising: '私のデータで気づいていないかもしれない驚くべきことは何ですか？一文だけで。',
    recommendation: '最近の行動に基づいた個人的なおすすめを1つください。一文だけで。',
  },
  ko: {
    patterns: '최근 활동과 패턴에 대한 흥미로운 인사이트를 하나 알려주세요. 한 문장으로만.',
    surprising: '제 데이터에서 제가 눈치채지 못했을 수 있는 놀라운 점이 무엇인가요? 한 문장으로만.',
    recommendation: '최근 행동을 바탕으로 개인화된 추천을 하나 해주세요. 한 문장으로만.',
  },
};

/**
 * Get default prompts for a service (fallback when not in Firestore)
 */
function getDefaultPrompts(service: string, language: string): Record<string, { id: string; content: string; metadata?: unknown }> | null {
  if (service === 'CarouselInsights') {
    const translations = CAROUSEL_TRANSLATIONS[language] || CAROUSEL_TRANSLATIONS['en'];
    return {
      insight_patterns: {
        id: 'carousel-insight-patterns',
        content: translations.patterns,
        metadata: { model: 'gpt-4o-mini', temperature: 0.8, maxTokens: 100 },
      },
      insight_surprising: {
        id: 'carousel-insight-surprising',
        content: translations.surprising,
        metadata: { model: 'gpt-4o-mini', temperature: 0.9, maxTokens: 100 },
      },
      insight_recommendation: {
        id: 'carousel-insight-recommendation',
        content: translations.recommendation,
        metadata: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 100 },
      },
    };
  }

  return null;
}
