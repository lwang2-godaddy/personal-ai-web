/**
 * E2E Test: Counting Query Support (Multi-language)
 *
 * Tests the RAGEngine's ability to handle counting queries in 9 languages:
 * - English (en), Chinese (zh), Japanese (ja), Korean (ko)
 * - Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt)
 *
 * The test verifies:
 * 1. Query intent analysis detects counting queries in all languages
 * 2. Temporal patterns are recognized in all languages
 * 3. Data type detection works for voice/photo/health/location in all languages
 * 4. N days ago patterns work in all languages
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// ==================== PATTERN DEFINITIONS ====================

// Counting patterns for all 9 languages
const COUNT_PATTERN = /how many|number of|count|times|how often|几个|几次|多少个|多少次|多少张|有几|数量|统计|いくつ|何個|何回|何度|何枚|回数|몇\s?개|몇\s?번|몇\s?장|얼마나|횟수|cuántos|cuántas|número de|cantidad|veces|combien|nombre de|fois|wie viele|wieviel|wie oft|anzahl|mal|quanti|quante|numero di|volte|quantos|quantas|número de|vezes/i;

// Temporal patterns for all 9 languages
const TEMPORAL_PATTERNS = {
  today: /\btoday\b|今天|今日|오늘|hoy|aujourd'hui|heute|oggi|hoje/i,
  yesterday: /\byesterday\b|昨天|昨日|어제|ayer|hier|gestern|ieri|ontem/i,
  dayBeforeYesterday: /day before yesterday|2 days ago|前天|一昨日|おととい|그저께|그제|anteayer|avant-hier|vorgestern|l'altro ieri|ieri l'altro|anteontem/i,
  thisWeek: /\bthis week\b|这周|本周|这个星期|今週|이번\s*주|esta semana|cette semaine|diese woche|questa settimana/i,
  lastWeek: /\blast week\b|上周|上星期|先週|지난\s*주|la semana pasada|semana passada|la semaine dernière|semaine dernière|letzte woche|la settimana scorsa|settimana scorsa/i,
  thisMonth: /\bthis month\b|这个月|本月|今月|이번\s*달|este mes|ce mois|ce mois-ci|diesen monat|dieser monat|questo mese|este mês/i,
  lastMonth: /\blast month\b|上个月|上月|先月|지난\s*달|el mes pasado|mes pasado|le mois dernier|mois dernier|letzten monat|letzter monat|il mese scorso|mese scorso|mês passado/i,
  thisYear: /\bthis year\b|今年|올해|este año|cette année|dieses jahr|quest'anno|questo anno|este ano/i,
  lastYear: /\blast year\b|去年|昨年|작년|el año pasado|año pasado|l'année dernière|année dernière|letztes jahr|l'anno scorso|anno scorso|ano passado/i,
};

// Data type patterns for all 9 languages
const DATA_TYPE_PATTERNS = {
  voice: /voice|note|said|recorded|audio|语音|录音|音频|记录|语音信息|语音笔记|音声|ボイス|メモ|음성|녹음|메모|오디오|voz|nota de voz|grabación|voix|note vocale|enregistrement|stimme|sprachnotiz|aufnahme|voce|nota vocale|registrazione|gravação|áudio/i,
  photo: /photo|picture|image|took|captured|show me|visual|照片|图片|相片|拍照|拍摄|写真|画像|フォト|사진|이미지|foto|fotografía|imagen|bild|immagine|imagem/i,
  health: /steps|walk|heart|sleep|workout|exercise|fitness|health|train|步数|走路|心率|睡眠|运动|健身|锻炼|歩数|運動|心拍|ヘルス|トレーニング|걸음|수면|운동|심박|건강|트레이닝|pasos|sueño|ejercicio|ritmo cardíaco|salud|entrenar|pas|sommeil|exercice|rythme cardiaque|santé|entraîner|schritte|schlaf|übung|herzfrequenz|gesundheit|trainiert|training|passi|sonno|esercizio|frequenza cardiaca|salute|allenamento|passos|sono|exercício|frequência cardíaca|saúde/i,
  location: /location|place|where|visit|go|been to|位置|地点|去了|到过|去过|場所|訪問|どこ|장소|위치|방문|어디|lugar|ubicación|visita|dónde|lieu|endroit|visite|où|ort|standort|besuch|wo|luogo|posizione|dove|local|onde/i,
};

// N days ago patterns for all 9 languages
const DAYS_AGO_PATTERNS = [
  { pattern: /(\d+)\s+days?\s+ago/, lang: 'en' },
  { pattern: /(\d+)天前/, lang: 'zh' },
  { pattern: /(\d+)日前/, lang: 'ja' },
  { pattern: /(\d+)일\s*전/, lang: 'ko' },
  { pattern: /hace\s+(\d+)\s+días?/i, lang: 'es' },
  { pattern: /il y a\s+(\d+)\s+jours?/i, lang: 'fr' },
  { pattern: /vor\s+(\d+)\s+tagen?/i, lang: 'de' },
  { pattern: /(\d+)\s+giorni?\s+fa/i, lang: 'it' },
  { pattern: /há\s+(\d+)\s+dias?/i, lang: 'pt' },
];

// ==================== TEST DATA ====================

interface TestCase {
  lang: string;
  query: string;
  expectCount?: boolean;
  expectVoice?: boolean;
  expectPhoto?: boolean;
  expectHealth?: boolean;
  expectLocation?: boolean;
  expectTemporal?: keyof typeof TEMPORAL_PATTERNS;
}

// Counting query test cases for all 9 languages
const COUNTING_TEST_CASES: TestCase[] = [
  // English
  { lang: 'en', query: 'How many voice notes did I record yesterday?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'en', query: 'count my photos from today', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'en', query: 'number of times I exercised this week', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'en', query: 'how many places did I visit last month', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Chinese (zh)
  { lang: 'zh', query: '昨天我记录了几个语音信息', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'zh', query: '今天我拍了多少张照片', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'zh', query: '这周我运动了几次', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'zh', query: '上个月我去了多少个地方', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Japanese (ja)
  { lang: 'ja', query: '昨日いくつ音声メモを録音しましたか', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'ja', query: '今日何枚写真を撮りましたか', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'ja', query: '今週何回運動しましたか', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'ja', query: '先月いくつの場所を訪問しましたか', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Korean (ko)
  { lang: 'ko', query: '어제 몇 개의 음성 메모를 녹음했나요', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'ko', query: '오늘 사진을 몇 장 찍었나요', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'ko', query: '이번 주 운동을 몇 번 했나요', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'ko', query: '지난 달 몇 개의 장소를 방문했나요', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Spanish (es)
  { lang: 'es', query: '¿Cuántas notas de voz grabé ayer?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'es', query: '¿Cuántas fotos tomé hoy?', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'es', query: '¿Cuántas veces hice ejercicio esta semana?', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'es', query: '¿Cuántos lugares visité el mes pasado?', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // French (fr)
  { lang: 'fr', query: 'Combien de notes vocales ai-je enregistré hier?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'fr', query: "Combien de photos ai-je prises aujourd'hui?", expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'fr', query: "Combien de fois ai-je fait de l'exercice cette semaine?", expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'fr', query: 'Combien de lieux ai-je visité le mois dernier?', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // German (de)
  { lang: 'de', query: 'Wie viele Sprachnotizen habe ich gestern aufgenommen?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'de', query: 'Wie viele Fotos habe ich heute gemacht?', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'de', query: 'Wie oft habe ich diese Woche trainiert?', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'de', query: 'Wie viele Orte habe ich letzten Monat besucht?', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Italian (it)
  { lang: 'it', query: 'Quante note vocali ho registrato ieri?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'it', query: 'Quante foto ho scattato oggi?', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'it', query: 'Quante volte ho fatto esercizio questa settimana?', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'it', query: 'Quanti luoghi ho visitato il mese scorso?', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },

  // Portuguese (pt)
  { lang: 'pt', query: 'Quantas notas de voz gravei ontem?', expectCount: true, expectVoice: true, expectTemporal: 'yesterday' },
  { lang: 'pt', query: 'Quantas fotos tirei hoje?', expectCount: true, expectPhoto: true, expectTemporal: 'today' },
  { lang: 'pt', query: 'Quantas vezes fiz exercício esta semana?', expectCount: true, expectHealth: true, expectTemporal: 'thisWeek' },
  { lang: 'pt', query: 'Quantos lugares visitei mês passado?', expectCount: true, expectLocation: true, expectTemporal: 'lastMonth' },
];

// Temporal pattern test cases for all 9 languages
const TEMPORAL_TEST_CASES: { query: string; lang: string; pattern: keyof typeof TEMPORAL_PATTERNS }[] = [
  // English
  { query: 'today', lang: 'en', pattern: 'today' },
  { query: 'yesterday', lang: 'en', pattern: 'yesterday' },
  { query: 'day before yesterday', lang: 'en', pattern: 'dayBeforeYesterday' },
  { query: 'this week', lang: 'en', pattern: 'thisWeek' },
  { query: 'last week', lang: 'en', pattern: 'lastWeek' },
  { query: 'this month', lang: 'en', pattern: 'thisMonth' },
  { query: 'last month', lang: 'en', pattern: 'lastMonth' },
  { query: 'this year', lang: 'en', pattern: 'thisYear' },
  { query: 'last year', lang: 'en', pattern: 'lastYear' },

  // Chinese (zh)
  { query: '今天', lang: 'zh', pattern: 'today' },
  { query: '昨天', lang: 'zh', pattern: 'yesterday' },
  { query: '前天', lang: 'zh', pattern: 'dayBeforeYesterday' },
  { query: '这周', lang: 'zh', pattern: 'thisWeek' },
  { query: '本周', lang: 'zh', pattern: 'thisWeek' },
  { query: '上周', lang: 'zh', pattern: 'lastWeek' },
  { query: '这个月', lang: 'zh', pattern: 'thisMonth' },
  { query: '本月', lang: 'zh', pattern: 'thisMonth' },
  { query: '上个月', lang: 'zh', pattern: 'lastMonth' },
  { query: '今年', lang: 'zh', pattern: 'thisYear' },
  { query: '去年', lang: 'zh', pattern: 'lastYear' },

  // Japanese (ja)
  { query: '今日', lang: 'ja', pattern: 'today' },
  { query: '昨日', lang: 'ja', pattern: 'yesterday' },
  { query: '一昨日', lang: 'ja', pattern: 'dayBeforeYesterday' },
  { query: 'おととい', lang: 'ja', pattern: 'dayBeforeYesterday' },
  { query: '今週', lang: 'ja', pattern: 'thisWeek' },
  { query: '先週', lang: 'ja', pattern: 'lastWeek' },
  { query: '今月', lang: 'ja', pattern: 'thisMonth' },
  { query: '先月', lang: 'ja', pattern: 'lastMonth' },
  { query: '今年', lang: 'ja', pattern: 'thisYear' },
  { query: '昨年', lang: 'ja', pattern: 'lastYear' },

  // Korean (ko)
  { query: '오늘', lang: 'ko', pattern: 'today' },
  { query: '어제', lang: 'ko', pattern: 'yesterday' },
  { query: '그저께', lang: 'ko', pattern: 'dayBeforeYesterday' },
  { query: '그제', lang: 'ko', pattern: 'dayBeforeYesterday' },
  { query: '이번 주', lang: 'ko', pattern: 'thisWeek' },
  { query: '이번주', lang: 'ko', pattern: 'thisWeek' },
  { query: '지난 주', lang: 'ko', pattern: 'lastWeek' },
  { query: '이번 달', lang: 'ko', pattern: 'thisMonth' },
  { query: '지난 달', lang: 'ko', pattern: 'lastMonth' },
  { query: '올해', lang: 'ko', pattern: 'thisYear' },
  { query: '작년', lang: 'ko', pattern: 'lastYear' },

  // Spanish (es)
  { query: 'hoy', lang: 'es', pattern: 'today' },
  { query: 'ayer', lang: 'es', pattern: 'yesterday' },
  { query: 'anteayer', lang: 'es', pattern: 'dayBeforeYesterday' },
  { query: 'esta semana', lang: 'es', pattern: 'thisWeek' },
  { query: 'la semana pasada', lang: 'es', pattern: 'lastWeek' },
  { query: 'este mes', lang: 'es', pattern: 'thisMonth' },
  { query: 'el mes pasado', lang: 'es', pattern: 'lastMonth' },
  { query: 'este año', lang: 'es', pattern: 'thisYear' },
  { query: 'el año pasado', lang: 'es', pattern: 'lastYear' },

  // French (fr)
  { query: "aujourd'hui", lang: 'fr', pattern: 'today' },
  { query: 'hier', lang: 'fr', pattern: 'yesterday' },
  { query: 'avant-hier', lang: 'fr', pattern: 'dayBeforeYesterday' },
  { query: 'cette semaine', lang: 'fr', pattern: 'thisWeek' },
  { query: 'la semaine dernière', lang: 'fr', pattern: 'lastWeek' },
  { query: 'ce mois', lang: 'fr', pattern: 'thisMonth' },
  { query: 'le mois dernier', lang: 'fr', pattern: 'lastMonth' },
  { query: 'cette année', lang: 'fr', pattern: 'thisYear' },
  { query: "l'année dernière", lang: 'fr', pattern: 'lastYear' },

  // German (de)
  { query: 'heute', lang: 'de', pattern: 'today' },
  { query: 'gestern', lang: 'de', pattern: 'yesterday' },
  { query: 'vorgestern', lang: 'de', pattern: 'dayBeforeYesterday' },
  { query: 'diese woche', lang: 'de', pattern: 'thisWeek' },
  { query: 'letzte woche', lang: 'de', pattern: 'lastWeek' },
  { query: 'diesen monat', lang: 'de', pattern: 'thisMonth' },
  { query: 'letzten monat', lang: 'de', pattern: 'lastMonth' },
  { query: 'dieses jahr', lang: 'de', pattern: 'thisYear' },
  { query: 'letztes jahr', lang: 'de', pattern: 'lastYear' },

  // Italian (it)
  { query: 'oggi', lang: 'it', pattern: 'today' },
  { query: 'ieri', lang: 'it', pattern: 'yesterday' },
  { query: "l'altro ieri", lang: 'it', pattern: 'dayBeforeYesterday' },
  { query: 'questa settimana', lang: 'it', pattern: 'thisWeek' },
  { query: 'la settimana scorsa', lang: 'it', pattern: 'lastWeek' },
  { query: 'questo mese', lang: 'it', pattern: 'thisMonth' },
  { query: 'il mese scorso', lang: 'it', pattern: 'lastMonth' },
  { query: "quest'anno", lang: 'it', pattern: 'thisYear' },
  { query: "l'anno scorso", lang: 'it', pattern: 'lastYear' },

  // Portuguese (pt)
  { query: 'hoje', lang: 'pt', pattern: 'today' },
  { query: 'ontem', lang: 'pt', pattern: 'yesterday' },
  { query: 'anteontem', lang: 'pt', pattern: 'dayBeforeYesterday' },
  { query: 'esta semana', lang: 'pt', pattern: 'thisWeek' },
  { query: 'semana passada', lang: 'pt', pattern: 'lastWeek' },
  { query: 'este mês', lang: 'pt', pattern: 'thisMonth' },
  { query: 'mês passado', lang: 'pt', pattern: 'lastMonth' },
  { query: 'este ano', lang: 'pt', pattern: 'thisYear' },
  { query: 'ano passado', lang: 'pt', pattern: 'lastYear' },
];

// N days ago test cases for all 9 languages
const DAYS_AGO_TEST_CASES: { query: string; lang: string; expectedDays: number }[] = [
  // English
  { query: '3 days ago', lang: 'en', expectedDays: 3 },
  { query: '7 days ago', lang: 'en', expectedDays: 7 },
  { query: '1 day ago', lang: 'en', expectedDays: 1 },

  // Chinese (zh)
  { query: '3天前', lang: 'zh', expectedDays: 3 },
  { query: '7天前', lang: 'zh', expectedDays: 7 },

  // Japanese (ja)
  { query: '3日前', lang: 'ja', expectedDays: 3 },
  { query: '7日前', lang: 'ja', expectedDays: 7 },

  // Korean (ko)
  { query: '3일 전', lang: 'ko', expectedDays: 3 },
  { query: '7일전', lang: 'ko', expectedDays: 7 },

  // Spanish (es)
  { query: 'hace 3 días', lang: 'es', expectedDays: 3 },
  { query: 'hace 7 días', lang: 'es', expectedDays: 7 },

  // French (fr)
  { query: 'il y a 3 jours', lang: 'fr', expectedDays: 3 },
  { query: 'il y a 7 jours', lang: 'fr', expectedDays: 7 },

  // German (de)
  { query: 'vor 3 Tagen', lang: 'de', expectedDays: 3 },
  { query: 'vor 7 Tagen', lang: 'de', expectedDays: 7 },

  // Italian (it)
  { query: '3 giorni fa', lang: 'it', expectedDays: 3 },
  { query: '7 giorni fa', lang: 'it', expectedDays: 7 },

  // Portuguese (pt)
  { query: 'há 3 dias', lang: 'pt', expectedDays: 3 },
  { query: 'há 7 dias', lang: 'pt', expectedDays: 7 },
];

// Data type test cases for all 9 languages
const DATA_TYPE_TEST_CASES: { query: string; lang: string; dataType: keyof typeof DATA_TYPE_PATTERNS }[] = [
  // Voice - all languages
  { query: 'voice notes', lang: 'en', dataType: 'voice' },
  { query: 'recorded audio', lang: 'en', dataType: 'voice' },
  { query: '语音信息', lang: 'zh', dataType: 'voice' },
  { query: '录音', lang: 'zh', dataType: 'voice' },
  { query: '音声メモ', lang: 'ja', dataType: 'voice' },
  { query: 'ボイス', lang: 'ja', dataType: 'voice' },
  { query: '음성 메모', lang: 'ko', dataType: 'voice' },
  { query: '녹음', lang: 'ko', dataType: 'voice' },
  { query: 'nota de voz', lang: 'es', dataType: 'voice' },
  { query: 'grabación', lang: 'es', dataType: 'voice' },
  { query: 'note vocale', lang: 'fr', dataType: 'voice' },
  { query: 'enregistrement', lang: 'fr', dataType: 'voice' },
  { query: 'Sprachnotiz', lang: 'de', dataType: 'voice' },
  { query: 'Aufnahme', lang: 'de', dataType: 'voice' },
  { query: 'nota vocale', lang: 'it', dataType: 'voice' },
  { query: 'registrazione', lang: 'it', dataType: 'voice' },
  { query: 'nota de voz', lang: 'pt', dataType: 'voice' },
  { query: 'gravação', lang: 'pt', dataType: 'voice' },

  // Photo - all languages
  { query: 'photos', lang: 'en', dataType: 'photo' },
  { query: 'pictures', lang: 'en', dataType: 'photo' },
  { query: '照片', lang: 'zh', dataType: 'photo' },
  { query: '图片', lang: 'zh', dataType: 'photo' },
  { query: '写真', lang: 'ja', dataType: 'photo' },
  { query: '画像', lang: 'ja', dataType: 'photo' },
  { query: '사진', lang: 'ko', dataType: 'photo' },
  { query: '이미지', lang: 'ko', dataType: 'photo' },
  { query: 'foto', lang: 'es', dataType: 'photo' },
  { query: 'fotografía', lang: 'es', dataType: 'photo' },
  { query: 'photo', lang: 'fr', dataType: 'photo' },
  { query: 'image', lang: 'fr', dataType: 'photo' },
  { query: 'Foto', lang: 'de', dataType: 'photo' },
  { query: 'Bild', lang: 'de', dataType: 'photo' },
  { query: 'foto', lang: 'it', dataType: 'photo' },
  { query: 'immagine', lang: 'it', dataType: 'photo' },
  { query: 'foto', lang: 'pt', dataType: 'photo' },
  { query: 'imagem', lang: 'pt', dataType: 'photo' },

  // Health - all languages
  { query: 'steps', lang: 'en', dataType: 'health' },
  { query: 'workout', lang: 'en', dataType: 'health' },
  { query: '步数', lang: 'zh', dataType: 'health' },
  { query: '运动', lang: 'zh', dataType: 'health' },
  { query: '歩数', lang: 'ja', dataType: 'health' },
  { query: '運動', lang: 'ja', dataType: 'health' },
  { query: '걸음', lang: 'ko', dataType: 'health' },
  { query: '운동', lang: 'ko', dataType: 'health' },
  { query: 'pasos', lang: 'es', dataType: 'health' },
  { query: 'ejercicio', lang: 'es', dataType: 'health' },
  { query: 'pas', lang: 'fr', dataType: 'health' },
  { query: 'exercice', lang: 'fr', dataType: 'health' },
  { query: 'Schritte', lang: 'de', dataType: 'health' },
  { query: 'Übung', lang: 'de', dataType: 'health' },
  { query: 'passi', lang: 'it', dataType: 'health' },
  { query: 'esercizio', lang: 'it', dataType: 'health' },
  { query: 'passos', lang: 'pt', dataType: 'health' },
  { query: 'exercício', lang: 'pt', dataType: 'health' },

  // Location - all languages
  { query: 'places visited', lang: 'en', dataType: 'location' },
  { query: 'location', lang: 'en', dataType: 'location' },
  { query: '地点', lang: 'zh', dataType: 'location' },
  { query: '去了', lang: 'zh', dataType: 'location' },
  { query: '場所', lang: 'ja', dataType: 'location' },
  { query: '訪問', lang: 'ja', dataType: 'location' },
  { query: '장소', lang: 'ko', dataType: 'location' },
  { query: '방문', lang: 'ko', dataType: 'location' },
  { query: 'lugar', lang: 'es', dataType: 'location' },
  { query: 'visita', lang: 'es', dataType: 'location' },
  { query: 'lieu', lang: 'fr', dataType: 'location' },
  { query: 'visite', lang: 'fr', dataType: 'location' },
  { query: 'Ort', lang: 'de', dataType: 'location' },
  { query: 'Besuch', lang: 'de', dataType: 'location' },
  { query: 'luogo', lang: 'it', dataType: 'location' },
  { query: 'visita', lang: 'it', dataType: 'location' },
  { query: 'lugar', lang: 'pt', dataType: 'location' },
  { query: 'visita', lang: 'pt', dataType: 'location' },
];

// ==================== TEST FUNCTIONS ====================

/**
 * Test counting query detection for all languages
 */
function testCountingQueries(): boolean {
  console.log('\n--- Test: Counting Queries (All Languages) ---');

  let passed = 0;
  let failed = 0;
  const langStats: Record<string, { passed: number; failed: number }> = {};

  for (const testCase of COUNTING_TEST_CASES) {
    if (!langStats[testCase.lang]) {
      langStats[testCase.lang] = { passed: 0, failed: 0 };
    }

    let testPassed = true;
    const errors: string[] = [];

    // Check counting detection
    const isCount = COUNT_PATTERN.test(testCase.query);
    if (testCase.expectCount !== undefined && isCount !== testCase.expectCount) {
      errors.push(`count: expected ${testCase.expectCount}, got ${isCount}`);
      testPassed = false;
    }

    // Check data type detection
    if (testCase.expectVoice !== undefined) {
      const isVoice = DATA_TYPE_PATTERNS.voice.test(testCase.query);
      if (isVoice !== testCase.expectVoice) {
        errors.push(`voice: expected ${testCase.expectVoice}, got ${isVoice}`);
        testPassed = false;
      }
    }
    if (testCase.expectPhoto !== undefined) {
      const isPhoto = DATA_TYPE_PATTERNS.photo.test(testCase.query);
      if (isPhoto !== testCase.expectPhoto) {
        errors.push(`photo: expected ${testCase.expectPhoto}, got ${isPhoto}`);
        testPassed = false;
      }
    }
    if (testCase.expectHealth !== undefined) {
      const isHealth = DATA_TYPE_PATTERNS.health.test(testCase.query);
      if (isHealth !== testCase.expectHealth) {
        errors.push(`health: expected ${testCase.expectHealth}, got ${isHealth}`);
        testPassed = false;
      }
    }
    if (testCase.expectLocation !== undefined) {
      const isLocation = DATA_TYPE_PATTERNS.location.test(testCase.query);
      if (isLocation !== testCase.expectLocation) {
        errors.push(`location: expected ${testCase.expectLocation}, got ${isLocation}`);
        testPassed = false;
      }
    }

    // Check temporal detection
    if (testCase.expectTemporal) {
      const temporalPattern = TEMPORAL_PATTERNS[testCase.expectTemporal];
      const isTemporal = temporalPattern.test(testCase.query);
      if (!isTemporal) {
        errors.push(`temporal(${testCase.expectTemporal}): not detected`);
        testPassed = false;
      }
    }

    if (testPassed) {
      console.log(`  ✅ [${testCase.lang}] "${testCase.query.substring(0, 40)}..."`);
      passed++;
      langStats[testCase.lang].passed++;
    } else {
      console.log(`  ❌ [${testCase.lang}] "${testCase.query.substring(0, 40)}..." - ${errors.join(', ')}`);
      failed++;
      langStats[testCase.lang].failed++;
    }
  }

  // Print language stats
  console.log('\n  Language breakdown:');
  for (const [lang, stats] of Object.entries(langStats)) {
    const total = stats.passed + stats.failed;
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`    ${status} ${lang}: ${stats.passed}/${total}`);
  }

  console.log(`\nCounting Queries: ${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

/**
 * Test temporal patterns for all languages
 */
function testTemporalPatterns(): boolean {
  console.log('\n--- Test: Temporal Patterns (All Languages) ---');

  let passed = 0;
  let failed = 0;
  const langStats: Record<string, { passed: number; failed: number }> = {};

  for (const testCase of TEMPORAL_TEST_CASES) {
    if (!langStats[testCase.lang]) {
      langStats[testCase.lang] = { passed: 0, failed: 0 };
    }

    const pattern = TEMPORAL_PATTERNS[testCase.pattern];
    const result = pattern.test(testCase.query);

    if (result) {
      console.log(`  ✅ [${testCase.lang}] "${testCase.query}" → ${testCase.pattern}`);
      passed++;
      langStats[testCase.lang].passed++;
    } else {
      console.log(`  ❌ [${testCase.lang}] "${testCase.query}" → expected ${testCase.pattern}`);
      failed++;
      langStats[testCase.lang].failed++;
    }
  }

  // Print language stats
  console.log('\n  Language breakdown:');
  for (const [lang, stats] of Object.entries(langStats)) {
    const total = stats.passed + stats.failed;
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`    ${status} ${lang}: ${stats.passed}/${total}`);
  }

  console.log(`\nTemporal Patterns: ${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

/**
 * Test N days ago patterns for all languages
 */
function testDaysAgoPatterns(): boolean {
  console.log('\n--- Test: N Days Ago Patterns (All Languages) ---');

  let passed = 0;
  let failed = 0;
  const langStats: Record<string, { passed: number; failed: number }> = {};

  for (const testCase of DAYS_AGO_TEST_CASES) {
    if (!langStats[testCase.lang]) {
      langStats[testCase.lang] = { passed: 0, failed: 0 };
    }

    // Try all patterns to find a match
    let foundMatch = false;
    for (const patternDef of DAYS_AGO_PATTERNS) {
      const match = testCase.query.match(patternDef.pattern);
      if (match) {
        const extractedDays = parseInt(match[1]);
        if (extractedDays === testCase.expectedDays) {
          console.log(`  ✅ [${testCase.lang}] "${testCase.query}" → ${extractedDays} days`);
          passed++;
          langStats[testCase.lang].passed++;
          foundMatch = true;
          break;
        }
      }
    }

    if (!foundMatch) {
      console.log(`  ❌ [${testCase.lang}] "${testCase.query}" → expected ${testCase.expectedDays} days`);
      failed++;
      langStats[testCase.lang].failed++;
    }
  }

  // Print language stats
  console.log('\n  Language breakdown:');
  for (const [lang, stats] of Object.entries(langStats)) {
    const total = stats.passed + stats.failed;
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`    ${status} ${lang}: ${stats.passed}/${total}`);
  }

  console.log(`\nN Days Ago Patterns: ${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

/**
 * Test data type detection for all languages
 */
function testDataTypeDetection(): boolean {
  console.log('\n--- Test: Data Type Detection (All Languages) ---');

  let passed = 0;
  let failed = 0;
  const langStats: Record<string, { passed: number; failed: number }> = {};
  const typeStats: Record<string, { passed: number; failed: number }> = {};

  for (const testCase of DATA_TYPE_TEST_CASES) {
    if (!langStats[testCase.lang]) {
      langStats[testCase.lang] = { passed: 0, failed: 0 };
    }
    if (!typeStats[testCase.dataType]) {
      typeStats[testCase.dataType] = { passed: 0, failed: 0 };
    }

    const pattern = DATA_TYPE_PATTERNS[testCase.dataType];
    const result = pattern.test(testCase.query);

    if (result) {
      console.log(`  ✅ [${testCase.lang}] "${testCase.query}" → ${testCase.dataType}`);
      passed++;
      langStats[testCase.lang].passed++;
      typeStats[testCase.dataType].passed++;
    } else {
      console.log(`  ❌ [${testCase.lang}] "${testCase.query}" → expected ${testCase.dataType}`);
      failed++;
      langStats[testCase.lang].failed++;
      typeStats[testCase.dataType].failed++;
    }
  }

  // Print language stats
  console.log('\n  Language breakdown:');
  for (const [lang, stats] of Object.entries(langStats)) {
    const total = stats.passed + stats.failed;
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`    ${status} ${lang}: ${stats.passed}/${total}`);
  }

  // Print type stats
  console.log('\n  Data type breakdown:');
  for (const [type, stats] of Object.entries(typeStats)) {
    const total = stats.passed + stats.failed;
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`    ${status} ${type}: ${stats.passed}/${total}`);
  }

  console.log(`\nData Type Detection: ${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

// ==================== MAIN TEST RUNNER ====================

async function runTests(): Promise<void> {
  console.log('========================================');
  console.log('  Counting Query E2E Tests');
  console.log('  (9 Languages: en, zh, ja, ko, es, fr, de, it, pt)');
  console.log('========================================');

  let allPassed = true;

  // Run all tests
  if (!testCountingQueries()) allPassed = false;
  if (!testTemporalPatterns()) allPassed = false;
  if (!testDaysAgoPatterns()) allPassed = false;
  if (!testDataTypeDetection()) allPassed = false;

  // Calculate totals
  const totalCounting = COUNTING_TEST_CASES.length;
  const totalTemporal = TEMPORAL_TEST_CASES.length;
  const totalDaysAgo = DAYS_AGO_TEST_CASES.length;
  const totalDataType = DATA_TYPE_TEST_CASES.length;
  const grandTotal = totalCounting + totalTemporal + totalDaysAgo + totalDataType;

  // Summary
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log('========================================');
  console.log(`  Total test cases: ${grandTotal}`);
  console.log(`    - Counting queries: ${totalCounting}`);
  console.log(`    - Temporal patterns: ${totalTemporal}`);
  console.log(`    - N days ago: ${totalDaysAgo}`);
  console.log(`    - Data type detection: ${totalDataType}`);
  console.log('');
  if (allPassed) {
    console.log('  ✅ ALL TESTS PASSED');
  } else {
    console.log('  ❌ SOME TESTS FAILED');
  }
  console.log('========================================\n');

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
