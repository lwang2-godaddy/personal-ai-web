/**
 * Seed LifeConnectionsService prompts to Firestore for all 9 languages
 *
 * This script creates the prompts needed for the Life Connections feature,
 * which discovers cross-domain correlations in user data.
 *
 * Usage:
 *   npx tsx scripts/seed-life-connections-prompts.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 *   - Or FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Now import firebase-admin after env vars are loaded
import * as admin from 'firebase-admin';

// Supported languages
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'] as const;

// Base prompt structure (English)
const basePrompts = {
  system: {
    id: 'life-connections-system',
    service: 'LifeConnectionsService',
    type: 'system',
    description: 'System prompt for generating life connection insights',
    content: `You are a personal insights assistant that helps users understand hidden patterns in their life data.

Guidelines:
- Be specific with numbers and percentages when available
- Use second person ("you") to address the user
- Keep explanations warm, encouraging, and actionable
- Focus on positive framing - even negative correlations can be opportunities
- Never make the user feel bad about their data
- Responses should feel like discoveries from a helpful friend`,
    metadata: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 300,
    },
  },
  explain_correlation: {
    id: 'explain-correlation',
    service: 'LifeConnectionsService',
    type: 'user',
    description: 'Generate an explanation for a discovered correlation',
    content: `Based on {{sampleSize}} days of data, I found a {{strength}} {{direction}} correlation between {{domainA}} and {{domainB}}.

Correlation coefficient: {{coefficient}}
Confidence: {{confidencePercent}}%

Write a 2-3 sentence explanation that:
1. Describes what this correlation means in plain language
2. Makes it feel like a helpful discovery
3. Ends with a brief actionable suggestion

Keep it warm and encouraging.`,
    metadata: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 200,
    },
  },
  generate_title: {
    id: 'generate-title',
    service: 'LifeConnectionsService',
    type: 'user',
    description: 'Generate a short title for a life connection insight',
    content: `Create a short title (max 8 words) for this insight:
{{domainA}} has a {{direction}} correlation with {{domainB}}.

Examples:
- "Badminton improves your sleep"
- "Morning gym boosts your mood"
- "Walking more, sleeping better"
- "Parks make you happier"

Return ONLY the title, nothing else.`,
    metadata: {
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 50,
    },
  },
  generate_recommendation: {
    id: 'generate-recommendation',
    service: 'LifeConnectionsService',
    type: 'user',
    description: 'Generate an actionable recommendation based on the correlation',
    content: `Based on this correlation:
- {{domainA}} {{direction}}ly affects {{domainB}}
- Strength: {{strength}}
- Confidence: {{confidencePercent}}%

Generate a brief, actionable recommendation (max 15 words).
Be specific and encouraging. Focus on what the user can do.`,
    metadata: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 50,
    },
  },
};

// Translations for each language
const translations: Record<string, typeof basePrompts> = {
  en: basePrompts,
  es: {
    system: {
      ...basePrompts.system,
      description: 'Prompt del sistema para generar insights de conexiones de vida',
      content: `Eres un asistente de insights personales que ayuda a los usuarios a entender patrones ocultos en sus datos de vida.

Directrices:
- Sé específico con números y porcentajes cuando estén disponibles
- Usa segunda persona ("tú") para dirigirte al usuario
- Mantén las explicaciones cálidas, alentadoras y accionables
- Enfócate en un encuadre positivo - incluso las correlaciones negativas pueden ser oportunidades
- Nunca hagas que el usuario se sienta mal por sus datos
- Las respuestas deben sentirse como descubrimientos de un amigo útil
- Responde siempre en español`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: 'Generar una explicación para una correlación descubierta',
      content: `Basándome en {{sampleSize}} días de datos, encontré una correlación {{strength}} {{direction}} entre {{domainA}} y {{domainB}}.

Coeficiente de correlación: {{coefficient}}
Confianza: {{confidencePercent}}%

Escribe una explicación de 2-3 oraciones que:
1. Describa lo que significa esta correlación en lenguaje simple
2. Lo haga sentir como un descubrimiento útil
3. Termine con una breve sugerencia accionable

Mantenlo cálido y alentador. Responde en español.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Generar un título corto para un insight de conexión de vida',
      content: `Crea un título corto (máximo 8 palabras) para este insight:
{{domainA}} tiene una correlación {{direction}} con {{domainB}}.

Ejemplos:
- "El bádminton mejora tu sueño"
- "El gimnasio matutino eleva tu ánimo"
- "Caminar más, dormir mejor"
- "Los parques te hacen más feliz"

Devuelve SOLO el título, nada más. En español.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Generar una recomendación accionable basada en la correlación',
      content: `Basándome en esta correlación:
- {{domainA}} afecta {{direction}}mente a {{domainB}}
- Fuerza: {{strength}}
- Confianza: {{confidencePercent}}%

Genera una recomendación breve y accionable (máximo 15 palabras).
Sé específico y alentador. Enfócate en lo que el usuario puede hacer. En español.`,
    },
  },
  fr: {
    system: {
      ...basePrompts.system,
      description: 'Prompt système pour générer des insights de connexions de vie',
      content: `Vous êtes un assistant d'insights personnels qui aide les utilisateurs à comprendre les modèles cachés dans leurs données de vie.

Directives:
- Soyez précis avec les chiffres et pourcentages lorsqu'ils sont disponibles
- Utilisez la deuxième personne ("vous") pour vous adresser à l'utilisateur
- Gardez les explications chaleureuses, encourageantes et actionnables
- Concentrez-vous sur un cadrage positif - même les corrélations négatives peuvent être des opportunités
- Ne faites jamais sentir mal l'utilisateur par rapport à ses données
- Les réponses doivent ressembler à des découvertes d'un ami serviable
- Répondez toujours en français`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: 'Générer une explication pour une corrélation découverte',
      content: `Basé sur {{sampleSize}} jours de données, j'ai trouvé une corrélation {{strength}} {{direction}} entre {{domainA}} et {{domainB}}.

Coefficient de corrélation: {{coefficient}}
Confiance: {{confidencePercent}}%

Écrivez une explication de 2-3 phrases qui:
1. Décrit ce que cette corrélation signifie en langage simple
2. Donne l'impression d'une découverte utile
3. Se termine par une brève suggestion actionnable

Gardez un ton chaleureux et encourageant. Répondez en français.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Générer un titre court pour un insight de connexion de vie',
      content: `Créez un titre court (max 8 mots) pour cet insight:
{{domainA}} a une corrélation {{direction}} avec {{domainB}}.

Exemples:
- "Le badminton améliore votre sommeil"
- "La gym matinale booste votre humeur"
- "Marcher plus, mieux dormir"
- "Les parcs vous rendent plus heureux"

Retournez UNIQUEMENT le titre, rien d'autre. En français.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Générer une recommandation actionnable basée sur la corrélation',
      content: `Basé sur cette corrélation:
- {{domainA}} affecte {{direction}}ment {{domainB}}
- Force: {{strength}}
- Confiance: {{confidencePercent}}%

Générez une recommandation brève et actionnable (max 15 mots).
Soyez précis et encourageant. Concentrez-vous sur ce que l'utilisateur peut faire. En français.`,
    },
  },
  de: {
    system: {
      ...basePrompts.system,
      description: 'Systemanweisung zur Generierung von Lebensverbindungs-Erkenntnissen',
      content: `Sie sind ein persönlicher Erkenntnisassistent, der Benutzern hilft, versteckte Muster in ihren Lebensdaten zu verstehen.

Richtlinien:
- Seien Sie spezifisch mit Zahlen und Prozentsätzen, wenn verfügbar
- Verwenden Sie die zweite Person ("Sie") um den Benutzer anzusprechen
- Halten Sie Erklärungen warm, ermutigend und umsetzbar
- Konzentrieren Sie sich auf positive Formulierungen - auch negative Korrelationen können Chancen sein
- Lassen Sie den Benutzer nie schlecht über seine Daten fühlen
- Antworten sollten sich wie Entdeckungen eines hilfreichen Freundes anfühlen
- Antworten Sie immer auf Deutsch`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: 'Eine Erklärung für eine entdeckte Korrelation generieren',
      content: `Basierend auf {{sampleSize}} Tagen Daten habe ich eine {{strength}} {{direction}} Korrelation zwischen {{domainA}} und {{domainB}} gefunden.

Korrelationskoeffizient: {{coefficient}}
Konfidenz: {{confidencePercent}}%

Schreiben Sie eine 2-3 Sätze Erklärung, die:
1. Beschreibt, was diese Korrelation in einfacher Sprache bedeutet
2. Es wie eine hilfreiche Entdeckung erscheinen lässt
3. Mit einem kurzen umsetzbaren Vorschlag endet

Halten Sie es warm und ermutigend. Antworten Sie auf Deutsch.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Einen kurzen Titel für eine Lebensverbindungs-Erkenntnis generieren',
      content: `Erstellen Sie einen kurzen Titel (max 8 Wörter) für diese Erkenntnis:
{{domainA}} hat eine {{direction}} Korrelation mit {{domainB}}.

Beispiele:
- "Badminton verbessert Ihren Schlaf"
- "Morgensport hebt Ihre Stimmung"
- "Mehr gehen, besser schlafen"
- "Parks machen Sie glücklicher"

Geben Sie NUR den Titel zurück, nichts anderes. Auf Deutsch.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Eine umsetzbare Empfehlung basierend auf der Korrelation generieren',
      content: `Basierend auf dieser Korrelation:
- {{domainA}} beeinflusst {{domainB}} {{direction}}
- Stärke: {{strength}}
- Konfidenz: {{confidencePercent}}%

Generieren Sie eine kurze, umsetzbare Empfehlung (max 15 Wörter).
Seien Sie spezifisch und ermutigend. Konzentrieren Sie sich darauf, was der Benutzer tun kann. Auf Deutsch.`,
    },
  },
  it: {
    system: {
      ...basePrompts.system,
      description: 'Prompt di sistema per generare insight sulle connessioni di vita',
      content: `Sei un assistente di insight personali che aiuta gli utenti a comprendere i pattern nascosti nei loro dati di vita.

Linee guida:
- Sii specifico con numeri e percentuali quando disponibili
- Usa la seconda persona ("tu") per rivolgerti all'utente
- Mantieni le spiegazioni calde, incoraggianti e attuabili
- Concentrati su una formulazione positiva - anche le correlazioni negative possono essere opportunità
- Non far mai sentire male l'utente riguardo ai suoi dati
- Le risposte dovrebbero sembrare scoperte di un amico utile
- Rispondi sempre in italiano`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: 'Generare una spiegazione per una correlazione scoperta',
      content: `Basandomi su {{sampleSize}} giorni di dati, ho trovato una correlazione {{strength}} {{direction}} tra {{domainA}} e {{domainB}}.

Coefficiente di correlazione: {{coefficient}}
Confidenza: {{confidencePercent}}%

Scrivi una spiegazione di 2-3 frasi che:
1. Descriva cosa significa questa correlazione in linguaggio semplice
2. La faccia sembrare una scoperta utile
3. Termini con un breve suggerimento attuabile

Mantienilo caldo e incoraggiante. Rispondi in italiano.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Generare un titolo breve per un insight di connessione di vita',
      content: `Crea un titolo breve (max 8 parole) per questo insight:
{{domainA}} ha una correlazione {{direction}} con {{domainB}}.

Esempi:
- "Il badminton migliora il tuo sonno"
- "La palestra mattutina migliora l'umore"
- "Camminare di più, dormire meglio"
- "I parchi ti rendono più felice"

Restituisci SOLO il titolo, nient'altro. In italiano.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Generare una raccomandazione attuabile basata sulla correlazione',
      content: `Basandomi su questa correlazione:
- {{domainA}} influenza {{direction}}mente {{domainB}}
- Forza: {{strength}}
- Confidenza: {{confidencePercent}}%

Genera una raccomandazione breve e attuabile (max 15 parole).
Sii specifico e incoraggiante. Concentrati su cosa l'utente può fare. In italiano.`,
    },
  },
  pt: {
    system: {
      ...basePrompts.system,
      description: 'Prompt do sistema para gerar insights de conexões de vida',
      content: `Você é um assistente de insights pessoais que ajuda os usuários a entender padrões ocultos em seus dados de vida.

Diretrizes:
- Seja específico com números e porcentagens quando disponíveis
- Use a segunda pessoa ("você") para se dirigir ao usuário
- Mantenha as explicações calorosas, encorajadoras e acionáveis
- Concentre-se em um enquadramento positivo - até correlações negativas podem ser oportunidades
- Nunca faça o usuário se sentir mal sobre seus dados
- As respostas devem parecer descobertas de um amigo prestativo
- Responda sempre em português`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: 'Gerar uma explicação para uma correlação descoberta',
      content: `Com base em {{sampleSize}} dias de dados, encontrei uma correlação {{strength}} {{direction}} entre {{domainA}} e {{domainB}}.

Coeficiente de correlação: {{coefficient}}
Confiança: {{confidencePercent}}%

Escreva uma explicação de 2-3 frases que:
1. Descreva o que essa correlação significa em linguagem simples
2. Faça parecer uma descoberta útil
3. Termine com uma breve sugestão acionável

Mantenha-o caloroso e encorajador. Responda em português.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Gerar um título curto para um insight de conexão de vida',
      content: `Crie um título curto (máximo 8 palavras) para este insight:
{{domainA}} tem uma correlação {{direction}} com {{domainB}}.

Exemplos:
- "Badminton melhora seu sono"
- "Academia matinal eleva seu humor"
- "Caminhar mais, dormir melhor"
- "Parques te deixam mais feliz"

Retorne APENAS o título, nada mais. Em português.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Gerar uma recomendação acionável baseada na correlação',
      content: `Com base nesta correlação:
- {{domainA}} afeta {{direction}}mente {{domainB}}
- Força: {{strength}}
- Confiança: {{confidencePercent}}%

Gere uma recomendação breve e acionável (máximo 15 palavras).
Seja específico e encorajador. Concentre-se no que o usuário pode fazer. Em português.`,
    },
  },
  zh: {
    system: {
      ...basePrompts.system,
      description: '生成生活连接洞察的系统提示',
      content: `你是一个个人洞察助手，帮助用户理解他们生活数据中的隐藏模式。

指南：
- 有数据时要具体说明数字和百分比
- 使用第二人称（"你"）称呼用户
- 保持解释温暖、鼓励性和可操作性
- 专注于积极的表述 - 即使是负相关也可能是机会
- 永远不要让用户对他们的数据感到不好
- 回复应该感觉像是来自一个有帮助的朋友的发现
- 必须用中文回复`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: '为发现的相关性生成解释',
      content: `基于{{sampleSize}}天的数据，我发现{{domainA}}和{{domainB}}之间存在{{strength}}的{{direction}}相关性。

相关系数：{{coefficient}}
置信度：{{confidencePercent}}%

写一个2-3句的解释，要：
1. 用简单的语言描述这个相关性意味着什么
2. 让它感觉像是一个有用的发现
3. 以一个简短的可操作建议结束

保持温暖和鼓励性。用中文回复。`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: '为生活连接洞察生成简短标题',
      content: `为这个洞察创建一个简短的标题（最多8个字）：
{{domainA}}与{{domainB}}有{{direction}}相关性。

示例：
- "羽毛球改善你的睡眠"
- "晨练提升你的心情"
- "多走路，睡得更好"
- "公园让你更快乐"

只返回标题，不要其他内容。用中文。`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '基于相关性生成可操作的建议',
      content: `基于这个相关性：
- {{domainA}}{{direction}}地影响{{domainB}}
- 强度：{{strength}}
- 置信度：{{confidencePercent}}%

生成一个简短的可操作建议（最多15个字）。
要具体和鼓励性。专注于用户可以做什么。用中文。`,
    },
  },
  ja: {
    system: {
      ...basePrompts.system,
      description: 'ライフコネクションの洞察を生成するためのシステムプロンプト',
      content: `あなたは、ユーザーが自分の生活データの隠れたパターンを理解するのを助けるパーソナルインサイトアシスタントです。

ガイドライン：
- 数字やパーセンテージが利用可能な場合は具体的に
- 二人称（「あなた」）を使ってユーザーに話しかける
- 説明は温かく、励ましになり、実行可能なものに
- ポジティブな表現に焦点を当てる - ネガティブな相関関係も機会になりえます
- ユーザーがデータについて悪く感じることがないように
- 回答は役立つ友人からの発見のように感じられるように
- 必ず日本語で回答してください`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: '発見された相関関係の説明を生成',
      content: `{{sampleSize}}日間のデータに基づいて、{{domainA}}と{{domainB}}の間に{{strength}}な{{direction}}相関を発見しました。

相関係数：{{coefficient}}
信頼度：{{confidencePercent}}%

2-3文の説明を書いてください：
1. この相関が何を意味するかを簡単な言葉で説明
2. 役立つ発見のように感じられるように
3. 簡潔で実行可能な提案で締めくくる

温かく励ましになるように。日本語で回答してください。`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'ライフコネクションの洞察のための短いタイトルを生成',
      content: `このインサイトのための短いタイトル（最大8単語）を作成してください：
{{domainA}}は{{domainB}}と{{direction}}相関があります。

例：
- 「バドミントンが睡眠を改善」
- 「朝のジムで気分アップ」
- 「歩くほど眠りが良くなる」
- 「公園があなたを幸せに」

タイトルのみを返してください、他には何も。日本語で。`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '相関関係に基づいた実行可能な推奨事項を生成',
      content: `この相関関係に基づいて：
- {{domainA}}は{{domainB}}に{{direction}}に影響する
- 強さ：{{strength}}
- 信頼度：{{confidencePercent}}%

簡潔で実行可能な推奨事項を生成してください（最大15単語）。
具体的で励ましになるように。ユーザーができることに焦点を当てて。日本語で。`,
    },
  },
  ko: {
    system: {
      ...basePrompts.system,
      description: '라이프 커넥션 인사이트 생성을 위한 시스템 프롬프트',
      content: `당신은 사용자가 자신의 생활 데이터에서 숨겨진 패턴을 이해하도록 돕는 개인 인사이트 어시스턴트입니다.

가이드라인:
- 가능한 경우 숫자와 퍼센트를 구체적으로 제시하세요
- 사용자를 지칭할 때 2인칭("당신")을 사용하세요
- 설명은 따뜻하고, 격려가 되며, 실행 가능하게 유지하세요
- 긍정적인 프레이밍에 집중하세요 - 부정적인 상관관계도 기회가 될 수 있습니다
- 사용자가 자신의 데이터에 대해 나쁘게 느끼지 않도록 하세요
- 응답은 도움이 되는 친구의 발견처럼 느껴져야 합니다
- 항상 한국어로 응답하세요`,
    },
    explain_correlation: {
      ...basePrompts.explain_correlation,
      description: '발견된 상관관계에 대한 설명 생성',
      content: `{{sampleSize}}일간의 데이터를 기반으로, {{domainA}}와 {{domainB}} 사이에 {{strength}}한 {{direction}} 상관관계를 발견했습니다.

상관계수: {{coefficient}}
신뢰도: {{confidencePercent}}%

2-3문장의 설명을 작성하세요:
1. 이 상관관계가 무엇을 의미하는지 쉬운 말로 설명
2. 유용한 발견처럼 느껴지게
3. 간단하고 실행 가능한 제안으로 마무리

따뜻하고 격려가 되게 유지하세요. 한국어로 응답하세요.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: '라이프 커넥션 인사이트를 위한 짧은 제목 생성',
      content: `이 인사이트를 위한 짧은 제목(최대 8단어)을 만드세요:
{{domainA}}는 {{domainB}}와 {{direction}} 상관관계가 있습니다.

예시:
- "배드민턴이 수면을 개선합니다"
- "아침 운동이 기분을 높입니다"
- "더 걸으면 더 잘 잡니다"
- "공원이 당신을 더 행복하게"

제목만 반환하세요, 다른 것은 없이. 한국어로.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '상관관계를 기반으로 실행 가능한 추천 생성',
      content: `이 상관관계를 기반으로:
- {{domainA}}가 {{domainB}}에 {{direction}}하게 영향을 미칩니다
- 강도: {{strength}}
- 신뢰도: {{confidencePercent}}%

간단하고 실행 가능한 추천을 생성하세요(최대 15단어).
구체적이고 격려가 되게. 사용자가 할 수 있는 것에 집중하세요. 한국어로.`,
    },
  },
};

function initializeFirebase() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (admin.apps && admin.apps.length > 0) {
    return admin.firestore();
  }

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log(`✅ Firebase initialized with project: ${projectId || serviceAccount.project_id}`);
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      projectId,
    });
    console.log(`✅ Firebase initialized from GOOGLE_APPLICATION_CREDENTIALS`);
  } else {
    console.error('Error: No Firebase credentials found.');
    console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS');
    console.error('\nCurrent env vars:');
    console.error(`  FIREBASE_SERVICE_ACCOUNT_KEY: ${serviceAccountKey ? 'set (length: ' + serviceAccountKey.length + ')' : 'not set'}`);
    console.error(`  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set'}`);
    console.error(`  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId || 'not set'}`);
    process.exit(1);
  }

  return admin.firestore();
}

async function seedLifeConnectionsPrompts() {
  console.log('Seeding LifeConnectionsService prompts for all 9 languages...\n');

  const db = initializeFirebase();

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const lang of LANGUAGES) {
    const docId = `${lang}_LifeConnectionsService`;
    const prompts = translations[lang] || basePrompts;

    const now = admin.firestore.Timestamp.now();

    try {
      // Use the correct path: promptConfigs/{lang}/services/{service}
      // This matches the admin portal at /admin/prompts
      const docRef = db
        .collection('promptConfigs')
        .doc(lang)
        .collection('services')
        .doc('LifeConnectionsService');

      const existingDoc = await docRef.get();

      if (existingDoc.exists) {
        await docRef.update({
          language: lang,
          service: 'LifeConnectionsService',
          version: '1.0.0',
          status: 'published',
          enabled: true,
          prompts,
          lastUpdated: now,
          updatedBy: 'seed-life-connections-prompts',
          updateNotes: 'Updated by seed script',
        });
        console.log(`✅ Updated promptConfigs/${lang}/services/LifeConnectionsService`);
        updateCount++;
      } else {
        await docRef.set({
          language: lang,
          service: 'LifeConnectionsService',
          version: '1.0.0',
          status: 'published',
          enabled: true,
          prompts,
          createdAt: now,
          createdBy: 'seed-life-connections-prompts',
          lastUpdated: now,
          updatedBy: 'seed-life-connections-prompts',
          updateNotes: 'Initial creation by seed script',
          publishedAt: now,
        });
        console.log(`✅ Created promptConfigs/${lang}/services/LifeConnectionsService`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error for ${lang}:`, error);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Summary:`);
  console.log(`  Created: ${successCount}`);
  console.log(`  Updated: ${updateCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('========================================\n');

  if (errorCount === 0) {
    console.log('✅ All LifeConnectionsService prompts seeded successfully!');
    console.log('\nThe Life Connections feature is now ready to generate AI insights.');
    console.log('Prompts can be edited via the admin portal at /admin/prompts');
  } else {
    console.log('⚠️ Some prompts failed to seed. Check errors above.');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Seed LifeConnectionsService Prompts to Firestore

Usage:
  npx tsx scripts/seed-life-connections-prompts.ts [options]

Options:
  --help       Show this help message

Prerequisites:
  Set one of these environment variables:
  - FIREBASE_SERVICE_ACCOUNT_KEY (JSON string in .env.local)
  - GOOGLE_APPLICATION_CREDENTIALS (path to service account file)

This script creates prompts for the Life Connections feature in all 9 languages:
  en, es, fr, de, it, pt, zh, ja, ko
`);
  process.exit(0);
}

seedLifeConnectionsPrompts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
