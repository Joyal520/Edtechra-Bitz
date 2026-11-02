import React from 'react';
import { Check, Lightbulb, BookOpen, Sparkles } from 'lucide-react';
import { CourseBlock } from '@/types/courseStudio';
import { FormattedLessonText, TextScale, parseInlineMarkdown } from '@/utils/courseTextFormatting';

interface CourseReaderBlockProps {
  block: CourseBlock;
  index: number;
  textScale: TextScale;
  isDarkTheme: boolean;
}

const DAY_1_OBJECTIVES = [
  'explain when we use the Simple Past Tense',
  'identify regular and irregular past verbs',
  'form positive sentences in the Simple Past',
  'use common past-time expressions',
  'understand Simple Past examples from the Annabelle story'
];

function extractBulletItems(markdown: string): string[] {
  if (!markdown) return [];
  return markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*+•]\s+/.test(l))
    .map(l => l.replace(/^[-*+•]\s+/, '').replace(/^\[[ xX]\]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Renders structured digital-textbook blocks for the Student Course Reader
 * of "Learn the Simple Past Through the Legend of Annabelle".
 * Returns null if the block should fall back to standard rendering.
 */
export const AnnabelleCourseReaderBlock: React.FC<CourseReaderBlockProps> = ({
  block,
  textScale
}) => {
  const { block_type, content } = block;
  const rawContent = (content || {}) as Record<string, any>;
  const rawTitle = String(rawContent.title || '').trim();
  const bodyText = String(rawContent.text || rawContent.markdown || '').trim();

  // ==========================================================================
  // 1. LEARNING OBJECTIVES SECTION (Day 1 & Days 2–7)
  // ==========================================================================
  if (block_type === 'text' && /^learning\s+objectives/i.test(rawTitle)) {
    const isDay1Objectives = /simple\s+past\s+tense/i.test(rawTitle);
    const extracted = extractBulletItems(bodyText);
    const objectives = isDay1Objectives
      ? DAY_1_OBJECTIVES
      : extracted.length > 0
      ? extracted
      : DAY_1_OBJECTIVES;

    return (
      <section className="course-reader__section course-reader__objectives" aria-label="Learning Objectives">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h2 className="course-reader__section-title mb-0">Learning Objectives</h2>
          <span className="course-reader__eyebrow-badge">Today&apos;s Learning Goals</span>
        </div>

        <div className="course-reader__objectives-card">
          <p className="course-reader__objectives-lead">
            By the end of this lesson, you will be able to:
          </p>
          <ul className="course-reader__objectives-list" role="list">
            {objectives.map((item, idx) => (
              <li key={idx} className="course-reader__objectives-item">
                <span className="course-reader__objectives-check" aria-hidden="true">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span className="course-reader__objectives-text">
                  {parseInlineMarkdown(item)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // ==========================================================================
  // 2. DAY 1 SECTION 1: "1. What Is the Simple Past Tense?"
  // ==========================================================================
  if (block_type === 'text' && /^1\.\s*what\s+is\s+the\s+simple\s+past\s+tense/i.test(rawTitle)) {
    const examples = [
      { before: 'We', verb: 'WALKED', after: 'in the park.', base: 'walk → walked' },
      { before: 'She', verb: 'RAN', after: 'fast.', base: 'run → ran' },
      { before: 'They', verb: 'VISITED', after: 'the museum.', base: 'visit → visited' },
      { before: 'He', verb: 'OPENED', after: 'the window.', base: 'open → opened' }
    ];

    return (
      <section className="course-reader__section" aria-label="1. What Is the Simple Past Tense?">
        <h2 className="course-reader__section-title">1. What Is the Simple Past Tense?</h2>

        <p className="course-reader__prose">
          In English, we use the Simple Past Tense whenever we talk about events, habits, or actions that took place at a finished time before now. Whether something happened yesterday, last week, or in 1970 as in the Annabelle story, the Simple Past tells the reader that the action is already over.
        </p>

        {/* DEFINITION CALLOUT CARD */}
        <div className="course-reader__definition my-4">
          <div className="course-reader__callout-label">
            <BookOpen className="w-3.5 h-3.5" />
            <span>DEFINITION</span>
          </div>
          <div className="course-reader__definition-headline">
            WE USE THE SIMPLE PAST TENSE
          </div>
          <p className="course-reader__definition-body mb-0">
            to talk about actions that started and finished in the past.
          </p>
        </div>

        {/* SENTENCE STRUCTURE / GRAMMAR FORMULA CARD */}
        <div className="course-reader__formula my-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h3 className="course-reader__subsection-title mb-0">Sentence Structure</h3>
            <span className="course-reader__formula-badge">GRAMMAR FORMULA</span>
          </div>

          <div className="course-reader__formula-summary mb-3">
            Subject + Past Form of the Verb + Extra Information
          </div>

          <div className="course-reader__formula-diagram">
            <div className="course-reader__formula-part">
              <span className="course-reader__formula-part-label">SUBJECT</span>
              <span className="course-reader__formula-part-sample">We</span>
            </div>
            <span className="course-reader__formula-operator" aria-hidden="true">+</span>
            <div className="course-reader__formula-part course-reader__formula-part--verb">
              <span className="course-reader__formula-part-label">PAST VERB</span>
              <span className="course-reader__formula-part-sample">walked</span>
            </div>
            <span className="course-reader__formula-operator" aria-hidden="true">+</span>
            <div className="course-reader__formula-part">
              <span className="course-reader__formula-part-label">EXTRA INFORMATION</span>
              <span className="course-reader__formula-part-sample">in the park.</span>
            </div>
          </div>

          <div className="course-reader__formula-example mt-3">
            <span className="course-reader__formula-example-tag">Model Sentence:</span>
            <span className="course-reader__formula-example-sentence">
              We <span className="course-reader__key-verb">walked</span> in the park.
            </span>
          </div>
        </div>

        {/* EXAMPLES SECTION */}
        <div className="course-reader__examples-block mt-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h3 className="course-reader__subsection-title mb-0">Examples</h3>
            <span className="course-reader__hint-tag">Past-tense verbs are highlighted</span>
          </div>

          <div className="row g-3">
            {examples.map((ex, idx) => (
              <div key={idx} className="col-12 col-md-6">
                <div className="course-reader__example h-100">
                  <div className="course-reader__example-sentence">
                    <span>{ex.before} </span>
                    <span className="course-reader__key-verb">{ex.verb}</span>
                    <span> {ex.after}</span>
                  </div>
                  <span className="course-reader__example-meta">{ex.base}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="course-reader__prose mt-4 mb-0">
          These actions happened in the past and are completely finished. Notice that in positive Simple Past sentences, the past form of the verb stays the same for all subjects—singular or plural.
        </p>
      </section>
    );
  }

  // ==========================================================================
  // 3. DAY 1 SECTIONS 2, 3, 4: "2. Two Types of Past Verbs", Regular & Irregular
  // ==========================================================================
  if (block_type === 'text' && /^2\.\s*two\s+types\s+of\s+past\s+verbs/i.test(rawTitle)) {
    const regularVerbs = [
      { base: 'live', past: 'lived', before: 'She', verb: 'lived', after: 'in the apartment.' },
      { base: 'laugh', past: 'laughed', before: 'We', verb: 'laughed', after: 'together.' },
      { base: 'study', past: 'studied', before: 'They', verb: 'studied', after: 'history.' },
      { base: 'play', past: 'played', before: 'The children', verb: 'played', after: 'outside.' },
      { base: 'dance', past: 'danced', before: 'He', verb: 'danced', after: 'at the party.' }
    ];

    const irregularVerbs = [
      { base: 'see', past: 'saw', before: 'She', verb: 'saw', after: 'a bird.' },
      { base: 'take', past: 'took', before: 'We', verb: 'took', after: 'the bus.' },
      { base: 'put', past: 'put', before: 'He', verb: 'put', after: 'the book on the table.' },
      { base: 'buy', past: 'bought', before: 'I', verb: 'bought', after: 'a new bag.' },
      { base: 'write', past: 'wrote', before: 'She', verb: 'wrote', after: 'a letter.' },
      { base: 'go', past: 'went', before: 'They', verb: 'went', after: 'home.' }
    ];

    return (
      <div className="course-reader__section-stack">
        {/* SECTION 2: TWO TYPES OF PAST VERBS */}
        <section className="course-reader__section" aria-label="2. Two Types of Past Verbs">
          <h2 className="course-reader__section-title">2. Two Types of Past Verbs</h2>
          <p className="course-reader__prose">
            We make the past form of verbs in two main ways. Every English verb in the Simple Past belongs to one of these two categories:
          </p>

          <div className="row g-3 g-lg-4 mt-1">
            <div className="col-12 col-md-6">
              <div className="course-reader__verb-type-card course-reader__verb-type-card--regular h-100">
                <div className="course-reader__verb-type-index">1. Regular verbs</div>
                <div className="course-reader__verb-type-heading">REGULAR VERBS</div>
                <p className="course-reader__verb-type-desc">
                  usually form the past by adding <strong>-d</strong>, <strong>-ed</strong>, or changing <strong>y to -ied</strong>.
                </p>
                <div className="course-reader__verb-type-pills">
                  <span className="course-reader__mini-pill">live → <strong>lived</strong></span>
                  <span className="course-reader__mini-pill">laugh → <strong>laughed</strong></span>
                  <span className="course-reader__mini-pill">study → <strong>studied</strong></span>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="course-reader__verb-type-card course-reader__verb-type-card--irregular h-100">
                <div className="course-reader__verb-type-index">2. Irregular verbs</div>
                <div className="course-reader__verb-type-heading">IRREGULAR VERBS</div>
                <p className="course-reader__verb-type-desc">
                  do not follow one fixed pattern. Their past forms change in special ways or stay the same.
                </p>
                <div className="course-reader__verb-type-pills">
                  <span className="course-reader__mini-pill">see → <strong>saw</strong></span>
                  <span className="course-reader__mini-pill">buy → <strong>bought</strong></span>
                  <span className="course-reader__mini-pill">put → <strong>put</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: REGULAR VERBS */}
        <section className="course-reader__section" aria-label="3. Regular Verbs">
          <h2 className="course-reader__section-title">3. Regular Verbs</h2>
          <p className="course-reader__prose">
            Regular verbs usually form the past tense by adding <strong>-d</strong>, <strong>-ed</strong>, or <strong>-ied</strong> to the base form of the verb. When a verb ends in <em>-e</em> (like <em>live</em> or <em>dance</em>), we add <strong>-d</strong>. When a verb ends in a consonant + <em>y</em> (like <em>study</em>), we change <em>y</em> to <strong>-ied</strong>.
          </p>

          <div className="table-responsive course-reader__table-wrapper my-4">
            <table className="table course-reader__table mb-0">
              <thead>
                <tr>
                  <th scope="col">Base Form</th>
                  <th scope="col">Past Form</th>
                  <th scope="col">Example</th>
                </tr>
              </thead>
              <tbody>
                {regularVerbs.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="course-reader__table-base">{row.base}</td>
                    <td className="course-reader__table-past">
                      <span className="course-reader__key-verb">{row.past}</span>
                    </td>
                    <td className="course-reader__table-example">
                      {row.before} <span className="course-reader__key-verb">{row.verb}</span> {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="course-reader__remember">
            <div className="course-reader__remember-header">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span>Remember:</span>
            </div>
            <div className="course-reader__remember-pills">
              {regularVerbs.map((v, i) => (
                <span key={i} className="course-reader__remember-chip">
                  <span>{v.base}</span>
                  <span className="course-reader__remember-arrow">→</span>
                  <strong>{v.past}</strong>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: IRREGULAR VERBS */}
        <section className="course-reader__section" aria-label="4. Irregular Verbs">
          <h2 className="course-reader__section-title">4. Irregular Verbs</h2>
          <p className="course-reader__prose">
            Some verbs do not form the past tense by adding <strong>-d</strong>, <strong>-ed</strong>, or <strong>-ied</strong>. These are called <strong>irregular verbs</strong>. Because each irregular verb has its own past form, reading and practicing them in sentences helps you remember them naturally.
          </p>

          <div className="table-responsive course-reader__table-wrapper my-4">
            <table className="table course-reader__table mb-0">
              <thead>
                <tr>
                  <th scope="col">Base Form</th>
                  <th scope="col">Past Form</th>
                  <th scope="col">Example</th>
                </tr>
              </thead>
              <tbody>
                {irregularVerbs.map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="course-reader__table-base">{row.base}</td>
                    <td className="course-reader__table-past">
                      <span className="course-reader__key-verb">{row.past}</span>
                    </td>
                    <td className="course-reader__table-example">
                      {row.before} <span className="course-reader__key-verb">{row.verb}</span> {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="course-reader__remember">
            <div className="course-reader__remember-header">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span>Remember:</span>
            </div>
            <p className="course-reader__remember-text mb-0">
              Some irregular verbs change completely (<em>go → <strong>went</strong></em>, <em>buy → <strong>bought</strong></em>). Others, such as <strong>put</strong>, stay the same (<em>put → <strong>put</strong></em>).
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================================================
  // 4. DAY 1 SECTION 5: "5. Read the Short Paragraph"
  // ==========================================================================
  if (
    (block_type === 'text_image' || (block_type === 'text' && rawContent.image?.url)) &&
    /^5\.\s*read\s+the\s+short\s+paragraph/i.test(rawTitle)
  ) {
    const img = rawContent.image || {};
    return (
      <section className="course-reader__section" aria-label="5. Read the Short Paragraph">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h2 className="course-reader__section-title mb-0">{rawTitle}</h2>
          <span className="course-reader__eyebrow-badge">Story Context • Simple Past in Action</span>
        </div>

        {img.url && (
          <figure className="course-reader__figure my-3">
            <div className="course-reader__figure-frame">
              <img
                src={img.url}
                alt={img.alt || img.caption || 'Story illustration'}
                className="course-reader__figure-img"
                loading="lazy"
              />
            </div>
            {img.caption && (
              <figcaption className="course-reader__figure-caption">
                {img.caption}
              </figcaption>
            )}
          </figure>
        )}

        <div className="course-reader__story-passage mt-3">
          <p className="course-reader__prose mb-0">
            In 1970, Donna <span className="course-reader__key-verb">received</span> a strange doll from her mother. She <span className="course-reader__key-verb">lived</span> with her friend Angie. At first, the doll <span className="course-reader__key-verb">looked</span> normal. Then Donna <span className="course-reader__key-verb">saw</span> it in different places. Donna <span className="course-reader__key-verb">became</span> scared. Later, the two paranormal investigators <span className="course-reader__key-verb">took</span> the doll to their museum and <span className="course-reader__key-verb">put</span> it in a glass case.
          </p>
        </div>
      </section>
    );
  }

  // ==========================================================================
  // 5. LESSON SUMMARY OR OTHER TEXT SECTIONS IN COURSE READER
  // ==========================================================================
  if (block_type === 'text' && !rawContent.image?.url && !rawContent.video?.url) {
    if (!bodyText && !rawTitle) return null;
    const isSummary = /lesson\s+summary|course\s+completion/i.test(rawTitle);

    return (
      <section
        className={`course-reader__section ${isSummary ? 'course-reader__section--summary' : ''}`}
        aria-label={rawTitle || 'Lesson Section'}
      >
        {rawTitle && (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="course-reader__section-title mb-0">{rawTitle}</h2>
            {isSummary && (
              <span className="course-reader__eyebrow-badge">
                <Sparkles className="w-3.5 h-3.5 me-1 inline" />
                Key Takeaways
              </span>
            )}
          </div>
        )}
        <div className="course-reader__markdown-body">
          <FormattedLessonText text={bodyText} textScale={textScale} />
        </div>
      </section>
    );
  }

  // ==========================================================================
  // 6. OTHER TEXT_IMAGE BLOCKS IN COURSE READER (e.g., Day 4, Day 7)
  // ==========================================================================
  if (block_type === 'text_image' || (block_type === 'text' && rawContent.image?.url)) {
    const img = rawContent.image || {};
    return (
      <section className="course-reader__section" aria-label={rawTitle || 'Illustrated Section'}>
        {rawTitle && <h2 className="course-reader__section-title">{rawTitle}</h2>}
        {img.url && (
          <figure className="course-reader__figure my-3">
            <div className="course-reader__figure-frame">
              <img
                src={img.url}
                alt={img.alt || img.caption || 'Story illustration'}
                className="course-reader__figure-img"
                loading="lazy"
              />
            </div>
            {img.caption && (
              <figcaption className="course-reader__figure-caption">
                {img.caption}
              </figcaption>
            )}
          </figure>
        )}
        <div className="course-reader__markdown-body mt-3">
          <FormattedLessonText text={bodyText} textScale={textScale} />
        </div>
      </section>
    );
  }

  return null;
};
