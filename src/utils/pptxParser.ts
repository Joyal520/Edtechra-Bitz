// ============================================================================
// EDTECHRA LIBRARY: High-Fidelity Client-Side PPTX Slide Parser
// Extracts structured slide data, titles, bullets, paragraphs, and embedded images
// using JSZip and native DOMParser with zero external server dependencies.
// ============================================================================

import JSZip from 'jszip';
import { ParsedPptxDeck, ParsedPptxSlide } from '@/types/library';

/**
 * Parses a PPTX file ArrayBuffer into structured slides.
 */
export async function parsePptx(fileBuffer: ArrayBuffer, fileName: string = 'Presentation'): Promise<ParsedPptxDeck> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const domParser = new DOMParser();

  // 1. Discover slide relationships from ppt/_rels/presentation.xml.rels
  const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');
  const slideRelMap = new Map<string, string>(); // rId -> target slide filename

  if (presentationRelsXml) {
    const relsDoc = domParser.parseFromString(presentationRelsXml, 'application/xml');
    const relationships = relsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i];
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      const type = rel.getAttribute('Type') || '';
      if (id && target && type.includes('slide')) {
        // Target can be 'slides/slide1.xml' or '/ppt/slides/slide1.xml'
        const cleanTarget = target.startsWith('ppt/') ? target : `ppt/${target.replace(/^\//, '')}`;
        slideRelMap.set(id, cleanTarget);
      }
    }
  }

  // 2. Discover slide ordering from ppt/presentation.xml
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const orderedSlidePaths: string[] = [];

  if (presentationXml) {
    const presDoc = domParser.parseFromString(presentationXml, 'application/xml');
    const sldIds = presDoc.getElementsByTagName('p:sldId');
    for (let i = 0; i < sldIds.length; i++) {
      const rId = sldIds[i].getAttribute('r:id');
      if (rId && slideRelMap.has(rId)) {
        orderedSlidePaths.push(slideRelMap.get(rId)!);
      }
    }
  }

  // Fallback: if presentation.xml didn't list them, find all ppt/slides/slide*.xml files
  if (orderedSlidePaths.length === 0) {
    const slideFileNames = Object.keys(zip.files).filter((k) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(k)
    );
    // Sort naturally: slide1, slide2, slide10
    slideFileNames.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
    orderedSlidePaths.push(...slideFileNames);
  }

  // 3. Process each slide
  const slides: ParsedPptxSlide[] = [];

  for (let idx = 0; idx < orderedSlidePaths.length; idx++) {
    const slidePath = orderedSlidePaths[idx];
    const slideXml = await zip.file(slidePath)?.async('text');
    if (!slideXml) continue;

    const slideDoc = domParser.parseFromString(slideXml, 'application/xml');

    // 3a. Extract images mapped in this slide's rels file
    const slideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const slideRelsXml = await zip.file(slideRelsPath)?.async('text');
    const imageMap = new Map<string, string>(); // rId -> media file path

    if (slideRelsXml) {
      const relsDoc = domParser.parseFromString(slideRelsXml, 'application/xml');
      const relationships = relsDoc.getElementsByTagName('Relationship');
      for (let r = 0; r < relationships.length; r++) {
        const rel = relationships[r];
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target') || '';
        const type = rel.getAttribute('Type') || '';
        if (id && type.includes('image')) {
          // Normalise path to ppt/media/...
          const cleanMedia = target.includes('media/')
            ? `ppt/media/${target.split('media/').pop()}`
            : target;
          imageMap.set(id, cleanMedia);
        }
      }
    }

    // Convert slide media files to Object URLs
    const slideImages: string[] = [];
    for (const [_, mediaPath] of imageMap.entries()) {
      const mediaFile = zip.file(mediaPath);
      if (mediaFile) {
        try {
          const blob = await mediaFile.async('blob');
          const objectUrl = URL.createObjectURL(blob);
          slideImages.push(objectUrl);
        } catch (e) {
          console.warn('[pptxParser] Failed to extract image:', mediaPath, e);
        }
      }
    }

    // 3b. Extract title, paragraphs, and bullet points
    let title: string | undefined;
    let subtitle: string | undefined;
    const content: string[] = [];
    const bulletPoints: string[] = [];

    // Shapes in slide: <p:sp>
    const shapes = slideDoc.getElementsByTagName('p:sp');
    for (let s = 0; s < shapes.length; s++) {
      const shape = shapes[s];
      const ph = shape.getElementsByTagName('p:ph')[0];
      const phType = ph?.getAttribute('type') || '';

      const isTitleShape = phType === 'title' || phType === 'ctrTitle';
      const isSubTitleShape = phType === 'subTitle';

      // Read paragraphs in this shape
      const paragraphs = shape.getElementsByTagName('a:p');
      const shapeParagraphTexts: string[] = [];

      for (let p = 0; p < paragraphs.length; p++) {
        const pElem = paragraphs[p];
        const textRuns = pElem.getElementsByTagName('a:t');
        let fullParaText = '';
        for (let t = 0; t < textRuns.length; t++) {
          fullParaText += textRuns[t].textContent || '';
        }
        fullParaText = fullParaText.trim();
        if (!fullParaText) continue;

        // Check if paragraph is styled as a bullet point
        const pPr = pElem.getElementsByTagName('a:pPr')[0];
        const hasBullet = pPr && (pPr.getElementsByTagName('a:buChar').length > 0 || pPr.getElementsByTagName('a:buAutoNum').length > 0 || pPr.getAttribute('lvl') !== null);

        if (isTitleShape && !title) {
          title = fullParaText;
        } else if (isSubTitleShape && !subtitle) {
          subtitle = fullParaText;
        } else if (hasBullet) {
          bulletPoints.push(fullParaText);
        } else {
          shapeParagraphTexts.push(fullParaText);
        }
      }

      if (!isTitleShape && !isSubTitleShape && shapeParagraphTexts.length > 0) {
        content.push(...shapeParagraphTexts);
      }
    }

    // Fallback: If title wasn't found by placeholder type, use the first content line
    if (!title && content.length > 0) {
      title = content.shift();
    } else if (!title && bulletPoints.length > 0) {
      title = bulletPoints.shift();
    }

    // Final fallback text extraction: search all <a:t> elements if shape parsing yielded nothing
    if (!title && content.length === 0 && bulletPoints.length === 0) {
      const allTextNodes = slideDoc.getElementsByTagName('a:t');
      const fallbackLines: string[] = [];
      for (let n = 0; n < allTextNodes.length; n++) {
        const txt = (allTextNodes[n].textContent || '').trim();
        if (txt) fallbackLines.push(txt);
      }
      if (fallbackLines.length > 0) {
        title = fallbackLines[0];
        content.push(...fallbackLines.slice(1));
      }
    }

    slides.push({
      slideNumber: idx + 1,
      title: title || `Slide ${idx + 1}`,
      subtitle,
      content,
      bulletPoints,
      images: slideImages
    });
  }

  // Safety fallback if file had no recognizable slides
  if (slides.length === 0) {
    slides.push({
      slideNumber: 1,
      title: fileName.replace(/\.[^/.]+$/, ''),
      content: ['Presentation slide loaded.'],
      bulletPoints: [],
      images: []
    });
  }

  return {
    title: slides[0]?.title || fileName.replace(/\.[^/.]+$/, ''),
    totalSlides: slides.length,
    slides
  };
}
