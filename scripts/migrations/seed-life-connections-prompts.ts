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
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

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
    content: `Based on {{sampleSize}} days of data ({{effectiveSampleSize}} effective after autocorrelation adjustment), I found a {{strength}} {{direction}} {{correlationType}} correlation between {{domainA}} and {{domainB}}.

Correlation coefficient: {{coefficient}}
Confidence: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Write a 2-3 sentence explanation that:
1. States specific numbers from the with/without comparison (e.g., "2 more hours of sleep")
2. Notes whether this holds after controlling for weekend/weekday patterns
3. Ends with a brief actionable suggestion based on the actual data

Do NOT give generic health advice. Use the specific numbers provided above. Keep it warm and encouraging.`,
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
{{withWithoutContext}}
{{percentDifference}}

Include specific numbers when available (e.g., percentage difference).

Examples:
- "Badminton adds 2h to your sleep"
- "Gym days: 34% better mood"
- "Walking more, sleeping 1.5h longer"
- "Parks boost mood by 28%"

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
{{withWithoutContext}}
{{confounderContext}}

Generate a brief, actionable recommendation (max 20 words).
Use specific numbers from the data (e.g., "Play badminton 3x/week — your data shows 2h more sleep on those days").
Be specific and encouraging. Focus on what the user can do.`,
    metadata: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 80,
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
      content: `Basándome en {{sampleSize}} días de datos ({{effectiveSampleSize}} efectivos), encontré una correlación {{strength}} {{direction}} {{correlationType}} entre {{domainA}} y {{domainB}}.

Coeficiente: {{coefficient}} | Confianza: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Escribe una explicación de 2-3 oraciones que:
1. Mencione números específicos de la comparación con/sin
2. Note si la correlación se mantiene tras controlar patrones de día de semana
3. Termine con una breve sugerencia accionable basada en los datos

NO des consejos genéricos de salud. Usa los números proporcionados. Mantenlo cálido y alentador. Responde en español.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Generar un título corto para un insight de conexión de vida',
      content: `Crea un título corto (máximo 8 palabras) para este insight:
{{domainA}} tiene una correlación {{direction}} con {{domainB}}.
{{withWithoutContext}}
{{percentDifference}}

Incluye números específicos cuando estén disponibles.

Ejemplos:
- "El bádminton añade 2h a tu sueño"
- "Días de gimnasio: 34% mejor ánimo"
- "Los parques mejoran el ánimo 28%"

Devuelve SOLO el título, nada más. En español.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Generar una recomendación accionable basada en la correlación',
      content: `Basándome en esta correlación:
- {{domainA}} afecta {{direction}}mente a {{domainB}}
- Fuerza: {{strength}}
- Confianza: {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

Genera una recomendación breve y accionable (máximo 20 palabras).
Usa números específicos de los datos. Sé específico y alentador. Enfócate en lo que el usuario puede hacer. En español.`,
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
      content: `Basé sur {{sampleSize}} jours de données ({{effectiveSampleSize}} effectifs après ajustement d'autocorrélation), j'ai trouvé une corrélation {{strength}} {{direction}} {{correlationType}} entre {{domainA}} et {{domainB}}.

Coefficient de corrélation : {{coefficient}}
Confiance : {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Écrivez une explication de 2-3 phrases qui :
1. Mentionne des chiffres spécifiques de la comparaison avec/sans
2. Note si la corrélation se maintient après contrôle des patterns jour de semaine/week-end
3. Se termine par une brève suggestion actionnable basée sur les données

Ne donnez PAS de conseils de santé génériques. Utilisez les chiffres spécifiques fournis ci-dessus. Gardez un ton chaleureux et encourageant. Répondez en français.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Générer un titre court pour un insight de connexion de vie',
      content: `Créez un titre court (max 8 mots) pour cet insight :
{{domainA}} a une corrélation {{direction}} avec {{domainB}}.
{{withWithoutContext}}
{{percentDifference}}

Incluez des chiffres spécifiques quand disponibles (ex. pourcentage de différence).

Exemples :
- "Le badminton ajoute 2h à votre sommeil"
- "Jours de gym : 34% meilleure humeur"
- "Marcher plus, dormir 1,5h de plus"
- "Les parcs améliorent l'humeur de 28%"

Retournez UNIQUEMENT le titre, rien d'autre. En français.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Générer une recommandation actionnable basée sur la corrélation',
      content: `Basé sur cette corrélation :
- {{domainA}} affecte {{direction}}ment {{domainB}}
- Force : {{strength}}
- Confiance : {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

Générez une recommandation brève et actionnable (max 20 mots).
Utilisez des chiffres spécifiques des données (ex. "Jouez au badminton 3x/semaine — vos données montrent 2h de sommeil en plus ces jours-là").
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
      content: `Basierend auf {{sampleSize}} Tagen Daten ({{effectiveSampleSize}} effektiv nach Autokorrelationsanpassung) habe ich eine {{strength}} {{direction}} {{correlationType}} Korrelation zwischen {{domainA}} und {{domainB}} gefunden.

Korrelationskoeffizient: {{coefficient}}
Konfidenz: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Schreiben Sie eine 2-3 Sätze Erklärung, die:
1. Spezifische Zahlen aus dem Mit/Ohne-Vergleich nennt
2. Anmerkt, ob dies nach Kontrolle der Wochentag/Wochenend-Muster gilt
3. Mit einem kurzen umsetzbaren Vorschlag basierend auf den Daten endet

Geben Sie KEINE allgemeinen Gesundheitsratschläge. Verwenden Sie die oben angegebenen spezifischen Zahlen. Halten Sie es warm und ermutigend. Antworten Sie auf Deutsch.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Einen kurzen Titel für eine Lebensverbindungs-Erkenntnis generieren',
      content: `Erstellen Sie einen kurzen Titel (max 8 Wörter) für diese Erkenntnis:
{{domainA}} hat eine {{direction}} Korrelation mit {{domainB}}.
{{withWithoutContext}}
{{percentDifference}}

Verwenden Sie spezifische Zahlen wenn verfügbar (z.B. Prozentunterschied).

Beispiele:
- "Badminton bringt 2h mehr Schlaf"
- "Gym-Tage: 34% bessere Stimmung"
- "Mehr gehen, 1,5h länger schlafen"
- "Parks verbessern Stimmung um 28%"

Geben Sie NUR den Titel zurück, nichts anderes. Auf Deutsch.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Eine umsetzbare Empfehlung basierend auf der Korrelation generieren',
      content: `Basierend auf dieser Korrelation:
- {{domainA}} beeinflusst {{domainB}} {{direction}}
- Stärke: {{strength}}
- Konfidenz: {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

Generieren Sie eine kurze, umsetzbare Empfehlung (max 20 Wörter).
Verwenden Sie spezifische Zahlen aus den Daten (z.B. "Spielen Sie 3x/Woche Badminton — Ihre Daten zeigen 2h mehr Schlaf an diesen Tagen").
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
      content: `Basandomi su {{sampleSize}} giorni di dati ({{effectiveSampleSize}} effettivi dopo aggiustamento per autocorrelazione), ho trovato una correlazione {{strength}} {{direction}} {{correlationType}} tra {{domainA}} e {{domainB}}.

Coefficiente di correlazione: {{coefficient}}
Confidenza: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Scrivi una spiegazione di 2-3 frasi che:
1. Menzioni numeri specifici dal confronto con/senza
2. Noti se la correlazione si mantiene dopo il controllo dei pattern giorno feriale/weekend
3. Termini con un breve suggerimento attuabile basato sui dati

NON dare consigli generici sulla salute. Usa i numeri specifici forniti sopra. Mantienilo caldo e incoraggiante. Rispondi in italiano.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Generare un titolo breve per un insight di connessione di vita',
      content: `Crea un titolo breve (max 8 parole) per questo insight:
{{domainA}} ha una correlazione {{direction}} con {{domainB}}.
{{withWithoutContext}}
{{percentDifference}}

Includi numeri specifici quando disponibili (es. percentuale di differenza).

Esempi:
- "Il badminton aggiunge 2h al tuo sonno"
- "Giorni di palestra: 34% umore migliore"
- "Camminare di più, dormire 1,5h in più"
- "I parchi migliorano l'umore del 28%"

Restituisci SOLO il titolo, nient'altro. In italiano.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Generare una raccomandazione attuabile basata sulla correlazione',
      content: `Basandomi su questa correlazione:
- {{domainA}} influenza {{direction}}mente {{domainB}}
- Forza: {{strength}}
- Confidenza: {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

Genera una raccomandazione breve e attuabile (max 20 parole).
Usa numeri specifici dai dati (es. "Gioca a badminton 3x/settimana — i tuoi dati mostrano 2h di sonno in più in quei giorni").
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
      content: `Com base em {{sampleSize}} dias de dados ({{effectiveSampleSize}} efetivos após ajuste de autocorrelação), encontrei uma correlação {{strength}} {{direction}} {{correlationType}} entre {{domainA}} e {{domainB}}.

Coeficiente de correlação: {{coefficient}}
Confiança: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

Escreva uma explicação de 2-3 frases que:
1. Mencione números específicos da comparação com/sem
2. Note se a correlação se mantém após controlar padrões de dia de semana/fim de semana
3. Termine com uma breve sugestão acionável baseada nos dados

NÃO dê conselhos genéricos de saúde. Use os números específicos fornecidos acima. Mantenha-o caloroso e encorajador. Responda em português.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'Gerar um título curto para um insight de conexão de vida',
      content: `Crie um título curto (máximo 8 palavras) para este insight:
{{domainA}} tem uma correlação {{direction}} com {{domainB}}.
{{withWithoutContext}}
{{percentDifference}}

Inclua números específicos quando disponíveis (ex. percentual de diferença).

Exemplos:
- "Badminton adiciona 2h ao seu sono"
- "Dias de academia: 34% melhor humor"
- "Caminhar mais, dormir 1,5h a mais"
- "Parques melhoram humor em 28%"

Retorne APENAS o título, nada mais. Em português.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: 'Gerar uma recomendação acionável baseada na correlação',
      content: `Com base nesta correlação:
- {{domainA}} afeta {{direction}}mente {{domainB}}
- Força: {{strength}}
- Confiança: {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

Gere uma recomendação breve e acionável (máximo 20 palavras).
Use números específicos dos dados (ex. "Jogue badminton 3x/semana — seus dados mostram 2h a mais de sono nesses dias").
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
      content: `基于{{sampleSize}}天的数据（{{effectiveSampleSize}}个有效样本，经自相关调整），我发现{{domainA}}和{{domainB}}之间存在{{strength}}的{{direction}} {{correlationType}}相关性。

相关系数：{{coefficient}}
置信度：{{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

写一个2-3句的解释，要：
1. 提及有/无对比中的具体数字
2. 指出在控制工作日/周末模式后相关性是否仍然成立
3. 以基于数据的简短可操作建议结束

不要给出泛泛的健康建议。使用上面提供的具体数字。保持温暖和鼓励性。用中文回复。`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: '为生活连接洞察生成简短标题',
      content: `为这个洞察创建一个简短的标题（最多8个字）：
{{domainA}}与{{domainB}}有{{direction}}相关性。
{{withWithoutContext}}
{{percentDifference}}

在可能时包含具体数字（如百分比差异）。

示例：
- "羽毛球多睡2小时"
- "健身日：心情好34%"
- "多走路，多睡1.5小时"
- "公园提升心情28%"

只返回标题，不要其他内容。用中文。`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '基于相关性生成可操作的建议',
      content: `基于这个相关性：
- {{domainA}}{{direction}}地影响{{domainB}}
- 强度：{{strength}}
- 置信度：{{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

生成一个简短的可操作建议（最多20个字）。
使用数据中的具体数字（如"每周打3次羽毛球——你的数据显示那些天多睡2小时"）。
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
      content: `{{sampleSize}}日間のデータ（自己相関調整後の有効サンプル{{effectiveSampleSize}}件）に基づいて、{{domainA}}と{{domainB}}の間に{{strength}}な{{direction}} {{correlationType}}相関を発見しました。

相関係数：{{coefficient}}
信頼度：{{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

2-3文の説明を書いてください：
1. あり/なし比較の具体的な数字を述べる
2. 平日/週末パターンを制御した後もこの相関が成立するかどうかに言及する
3. データに基づいた簡潔で実行可能な提案で締めくくる

一般的な健康アドバイスを述べないでください。上記の具体的な数字を使用してください。温かく励ましになるように。日本語で回答してください。`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: 'ライフコネクションの洞察のための短いタイトルを生成',
      content: `このインサイトのための短いタイトル（最大8単語）を作成してください：
{{domainA}}は{{domainB}}と{{direction}}相関があります。
{{withWithoutContext}}
{{percentDifference}}

可能な場合は具体的な数字を含めてください（例：パーセント差）。

例：
- 「バドミントンで睡眠2時間増」
- 「ジムの日：気分34%アップ」
- 「歩くほど1.5時間長く眠れる」
- 「公園で気分28%アップ」

タイトルのみを返してください、他には何も。日本語で。`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '相関関係に基づいた実行可能な推奨事項を生成',
      content: `この相関関係に基づいて：
- {{domainA}}は{{domainB}}に{{direction}}に影響する
- 強さ：{{strength}}
- 信頼度：{{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

簡潔で実行可能な推奨事項を生成してください（最大20単語）。
データの具体的な数字を使用してください（例：「週3回バドミントンを — データではその日は2時間多く睡眠」）。
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
      content: `{{sampleSize}}일간의 데이터(자기상관 조정 후 유효 샘플 {{effectiveSampleSize}}개)를 기반으로, {{domainA}}와 {{domainB}} 사이에 {{strength}}한 {{direction}} {{correlationType}} 상관관계를 발견했습니다.

상관계수: {{coefficient}}
신뢰도: {{confidencePercent}}%

{{withWithoutContext}}
{{confounderContext}}
{{trendContext}}
{{bestWorstContext}}

2-3문장의 설명을 작성하세요:
1. 있음/없음 비교의 구체적인 숫자를 언급
2. 주중/주말 패턴을 통제한 후에도 상관관계가 유지되는지 언급
3. 데이터에 기반한 간단하고 실행 가능한 제안으로 마무리

일반적인 건강 조언을 하지 마세요. 위에 제공된 구체적인 숫자를 사용하세요. 따뜻하고 격려가 되게 유지하세요. 한국어로 응답하세요.`,
    },
    generate_title: {
      ...basePrompts.generate_title,
      description: '라이프 커넥션 인사이트를 위한 짧은 제목 생성',
      content: `이 인사이트를 위한 짧은 제목(최대 8단어)을 만드세요:
{{domainA}}는 {{domainB}}와 {{direction}} 상관관계가 있습니다.
{{withWithoutContext}}
{{percentDifference}}

가능한 경우 구체적인 숫자를 포함하세요 (예: 퍼센트 차이).

예시:
- "배드민턴으로 수면 2시간 증가"
- "운동하는 날: 기분 34% 상승"
- "더 걸을수록 1.5시간 더 잠"
- "공원이 기분 28% 향상"

제목만 반환하세요, 다른 것은 없이. 한국어로.`,
    },
    generate_recommendation: {
      ...basePrompts.generate_recommendation,
      description: '상관관계를 기반으로 실행 가능한 추천 생성',
      content: `이 상관관계를 기반으로:
- {{domainA}}가 {{domainB}}에 {{direction}}하게 영향을 미칩니다
- 강도: {{strength}}
- 신뢰도: {{confidencePercent}}%
{{withWithoutContext}}
{{confounderContext}}

간단하고 실행 가능한 추천을 생성하세요(최대 20단어).
데이터의 구체적인 숫자를 사용하세요 (예: "주 3회 배드민턴 — 데이터에 따르면 그날 2시간 더 수면").
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
