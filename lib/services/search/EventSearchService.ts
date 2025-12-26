import { Event } from '@/lib/models/Event';
import FirestoreService from '@/lib/api/firebase/firestore';
import { where, orderBy, QueryConstraint } from 'firebase/firestore';

/**
 * EventSearchService - Web version
 * Handles event search with fuzzy matching, ranking, and filtering
 */
class EventSearchService {
  private static instance: EventSearchService;
  private searchHistoryKey = 'event_search_history';
  private maxHistoryItems = 10;

  private constructor() {}

  static getInstance(): EventSearchService {
    if (!EventSearchService.instance) {
      EventSearchService.instance = new EventSearchService();
    }
    return EventSearchService.instance;
  }

  /**
   * Search events across title, description, location, and participants
   */
  async searchEvents(
    userId: string,
    query: string,
    options?: {
      includeCompleted?: boolean;
      includeCancelled?: boolean;
      eventType?: string;
      dateRange?: { start?: Date; end?: Date };
    }
  ): Promise<Event[]> {
    if (!query.trim()) {
      return [];
    }

    // Fetch all events for the user (we'll filter client-side)
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('datetime', 'desc'),
    ];

    const docs = await FirestoreService.getDocuments<any>('events', constraints);

    // Convert Firestore docs to Event objects
    const events: Event[] = docs.map((doc: any) => ({
      id: doc.id,
      userId: doc.userId,
      title: doc.title,
      description: doc.description,
      datetime: doc.datetime?.toDate ? doc.datetime.toDate() : new Date(doc.datetime),
      endDatetime: doc.endDatetime?.toDate
        ? doc.endDatetime.toDate()
        : doc.endDatetime
        ? new Date(doc.endDatetime)
        : undefined,
      isAllDay: doc.isAllDay,
      type: doc.type,
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      sourceText: doc.sourceText,
      location: doc.location,
      locationId: doc.locationId,
      participants: doc.participants || [],
      recurrence: doc.recurrence,
      recurrenceEndDate: doc.recurrenceEndDate?.toDate
        ? doc.recurrenceEndDate.toDate()
        : doc.recurrenceEndDate
        ? new Date(doc.recurrenceEndDate)
        : undefined,
      status: doc.status,
      confidence: doc.confidence,
      reminders: doc.reminders || [],
      notificationScheduled: doc.notificationScheduled,
      notificationSentAt: doc.notificationSentAt?.toDate
        ? doc.notificationSentAt.toDate()
        : doc.notificationSentAt
        ? new Date(doc.notificationSentAt)
        : undefined,
      notificationId: doc.notificationId,
      userConfirmed: doc.userConfirmed,
      userModified: doc.userModified,
      completedAt: doc.completedAt?.toDate
        ? doc.completedAt.toDate()
        : doc.completedAt
        ? new Date(doc.completedAt)
        : undefined,
      createdAt: doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt),
      updatedAt: doc.updatedAt?.toDate ? doc.updatedAt.toDate() : new Date(doc.updatedAt),
      embeddingId: doc.embeddingId,
    }));

    // Apply filters
    let filteredEvents = events.filter((event) => {
      // Status filters
      if (!options?.includeCompleted && event.status === 'completed') return false;
      if (!options?.includeCancelled && event.status === 'cancelled') return false;

      // Type filter
      if (options?.eventType && options.eventType !== 'all' && event.type !== options.eventType) {
        return false;
      }

      // Date range filter
      if (options?.dateRange) {
        if (options.dateRange.start && event.datetime < options.dateRange.start) return false;
        if (options.dateRange.end && event.datetime > options.dateRange.end) return false;
      }

      return true;
    });

    // Search and rank
    const searchResults = filteredEvents
      .map((event) => ({
        event,
        relevance: this.calculateRelevance(event, query),
      }))
      .filter((result) => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .map((result) => result.event);

    return searchResults;
  }

  /**
   * Calculate search relevance score
   */
  private calculateRelevance(event: Event, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase().trim();
    const normalizedQuery = this.normalizeText(lowerQuery);

    // Title scoring (highest weight)
    const normalizedTitle = this.normalizeText(event.title.toLowerCase());
    if (normalizedTitle === normalizedQuery) score += 100; // Exact match
    else if (normalizedTitle.startsWith(normalizedQuery)) score += 50; // Prefix match
    else if (normalizedTitle.includes(normalizedQuery)) score += 25; // Substring match
    else if (this.fuzzyMatch(normalizedTitle, normalizedQuery)) score += 15; // Fuzzy match

    // Description scoring (medium weight)
    if (event.description) {
      const normalizedDesc = this.normalizeText(event.description.toLowerCase());
      if (normalizedDesc.includes(normalizedQuery)) score += 10;
      else if (this.fuzzyMatch(normalizedDesc, normalizedQuery)) score += 5;
    }

    // Location scoring (high weight)
    if (event.location) {
      const normalizedLoc = this.normalizeText(event.location.toLowerCase());
      if (normalizedLoc === normalizedQuery) score += 40; // Exact match
      else if (normalizedLoc.startsWith(normalizedQuery)) score += 20; // Prefix match
      else if (normalizedLoc.includes(normalizedQuery)) score += 10; // Substring match
      else if (this.fuzzyMatch(normalizedLoc, normalizedQuery)) score += 5; // Fuzzy match
    }

    // Participants scoring (medium weight)
    for (const participant of event.participants) {
      const normalizedParticipant = this.normalizeText(participant.toLowerCase());
      if (normalizedParticipant === normalizedQuery) score += 30; // Exact match
      else if (normalizedParticipant.startsWith(normalizedQuery)) score += 15; // Prefix match
      else if (normalizedParticipant.includes(normalizedQuery)) score += 8; // Substring match
      else if (this.fuzzyMatch(normalizedParticipant, normalizedQuery)) score += 4; // Fuzzy match
    }

    // Recency bonus (within 30 days)
    const daysSinceCreated = (Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) score += 5;

    return score;
  }

  /**
   * Fuzzy match using Levenshtein distance
   */
  private fuzzyMatch(text: string, query: string, maxDistance: number = 3): boolean {
    // For performance, only apply fuzzy matching on shorter strings
    if (query.length > 20 || text.length > 100) return false;

    const distance = this.levenshteinDistance(text, query);
    return distance <= maxDistance;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create distance matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Normalize text for comparison (remove extra spaces, special chars)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Save search query to history
   */
  saveSearchHistory(query: string): void {
    if (!query.trim()) return;

    try {
      const history = this.getSearchHistory();
      const normalizedQuery = query.trim();

      // Remove duplicate if exists
      const filtered = history.filter((q) => q.toLowerCase() !== normalizedQuery.toLowerCase());

      // Add to beginning
      const updated = [normalizedQuery, ...filtered].slice(0, this.maxHistoryItems);

      localStorage.setItem(this.searchHistoryKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    try {
      const stored = localStorage.getItem(this.searchHistoryKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    try {
      localStorage.removeItem(this.searchHistoryKey);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Highlight search terms in text
   */
  highlightSearchTerms(text: string, query: string): string {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default EventSearchService.getInstance();
