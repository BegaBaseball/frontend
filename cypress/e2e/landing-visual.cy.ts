/// <reference types="cypress" />

import { getHomeAuthRequestTraces, installHomeAuthRequestTrace } from '../support/homePage';

interface VisitLandingOptions {
  reducedMotion?: boolean;
  theme?: 'light' | 'dark';
  seedPressStartFont?: boolean;
}

const visitLanding = ({
  reducedMotion = false,
  seedPressStartFont = false,
  theme,
}: VisitLandingOptions = {}) => {
  cy.intercept('GET', '**/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      message: 'Unauthorized',
    },
  }).as('getSessionProfile');

  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      installHomeAuthRequestTrace(win);

      if (theme) {
        win.localStorage.setItem('kbo-theme', theme);
      }

      if (seedPressStartFont) {
        const link = win.document.createElement('link');
        link.id = 'retro-font-press-start';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
        link.dataset.testOwner = 'existing';
        win.document.head.appendChild(link);
      }

      if (reducedMotion) {
        win.matchMedia = (query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        });
      }
    },
  });

  cy.getBySel('landing-page').should('be.visible');
  cy.contains('10개 구단').should('be.visible');
  cy.contains('720경기의 시즌').should('be.visible');
  cy.get('@getSessionProfile.all').should('have.length', 0);
  getHomeAuthRequestTraces().should('deep.equal', []);
};

const assertNoHorizontalOverflow = () => {
  cy.window().then((win) => {
    const { document } = win;
    expect(document.documentElement.scrollWidth).to.be.at.most(win.innerWidth + 1);
    expect(document.body.scrollWidth).to.be.at.most(win.innerWidth + 1);
  });
};

interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const parseCssColor = (color: string): RgbaColor => {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Unsupported color: ${color}`);

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
};

const compositeColor = (foreground: RgbaColor, background: RgbaColor): RgbaColor => {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };

  const channel = (front: number, back: number) => (
    (front * foreground.alpha + back * background.alpha * (1 - foreground.alpha)) / alpha
  );

  return {
    red: channel(foreground.red, background.red),
    green: channel(foreground.green, background.green),
    blue: channel(foreground.blue, background.blue),
    alpha,
  };
};

const effectiveBackgroundColor = (element: HTMLElement): RgbaColor => {
  const layers: RgbaColor[] = [];
  let current: HTMLElement | null = element;

  while (current) {
    const layer = parseCssColor(getComputedStyle(current).backgroundColor);
    if (layer.alpha > 0) layers.push(layer);
    if (layer.alpha >= 1) break;
    current = current.parentElement;
  }

  return layers.reduceRight(
    (background, foreground) => compositeColor(foreground, background),
    { red: 255, green: 255, blue: 255, alpha: 1 },
  );
};

const relativeLuminance = (color: RgbaColor) => (
  [color.red, color.green, color.blue]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
);

const contrastRatio = (foreground: RgbaColor, background: RgbaColor) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const contrastAgainstWhite = (color: string) => {
  return contrastRatio(
    parseCssColor(color),
    { red: 255, green: 255, blue: 255, alpha: 1 },
  );
};

const compositedTextContrast = (element: HTMLElement) => {
  const background = effectiveBackgroundColor(element);
  const foreground = compositeColor(parseCssColor(getComputedStyle(element).color), background);
  return contrastRatio(foreground, background);
};

const getLandingInteractiveElements = (landing: HTMLElement) => {
  const candidates = landing.querySelectorAll<HTMLElement>([
    'a',
    'button',
    'input',
    'select',
    'textarea',
    '[contenteditable]',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]',
  ].join(', '));

  return [...candidates].filter((element) => {
    if (element.matches('a, button, input, select, textarea, [role="button"], [role="link"]')) {
      return true;
    }
    if (element.hasAttribute('contenteditable')) {
      return element.getAttribute('contenteditable')?.toLowerCase() !== 'false';
    }
    return element.hasAttribute('tabindex') && element.tabIndex >= 0;
  });
};

const emulateReducedMotion = (value: 'reduce' | 'no-preference') => (
  Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setEmulatedMedia',
    params: {
      features: [{ name: 'prefers-reduced-motion', value }],
    },
  })
);

const normalizedText = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim();

describe('Landing hero and ticker foundation', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('renders the season hero with a home navigation CTA and score ticker', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-score-ticker').should('be.visible');
    cy.getBySel('landing-home-cta')
      .should('be.visible')
      .and('have.attr', 'type', 'button')
      .and('contain.text', '홈으로 이동');
    cy.getBySel('landing-team-row').find('img').should('have.length', 10);
    assertNoHorizontalOverflow();
  });

  it('navigates from the root landing page to home', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-home-cta').click();
    cy.location('pathname').should('eq', '/home');
  });

  it('lets visitors pause and resume the score ticker', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-ticker-toggle').should('have.text', '티커 일시정지');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running');
    cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'false').click();
    cy.getBySel('landing-ticker-toggle').should('have.attr', 'aria-pressed', 'true').and('contain', '재생');
    cy.getBySel('landing-ticker-toggle').should('have.text', '티커 재생');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'paused');

    cy.getBySel('landing-ticker-toggle').click();
    cy.getBySel('landing-ticker-toggle')
      .should('have.attr', 'aria-pressed', 'false')
      .and('have.text', '티커 일시정지');
    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running');
  });

  it('aligns the duplicated ticker groups at the loop endpoint', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-ticker-track').should(($track) => {
      const [animation] = $track[0].getAnimations();
      const keyframes = (animation.effect as KeyframeEffect).getKeyframes();
      expect(keyframes[keyframes.length - 1].transform).to.equal(
        'translateX(calc(-50% - 22px))',
      );
    });
  });

  it('omits global navigation and footer chrome', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('[data-testid^="landing-header-"]').should('not.exist');
    cy.getBySel('landing-home-cta').should('exist');
    cy.get('footer').should('not.exist');
  });

  it('renders the app preview as a code-rendered phone', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-app-preview').scrollIntoView().should('be.visible');
    cy.getBySel('landing-phone').should('be.visible');
    cy.getBySel('landing-phone').contains('오늘의 승리 확률').should('be.visible');
    cy.getBySel('landing-phone').contains('같이가요').should('be.visible');
    cy.getBySel('landing-page').find('img[src*="landing-showcase-"]').should('not.exist');
  });

  it('renders all six numbered feature stories and their approved examples', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-feature-01').scrollIntoView();
    cy.getBySel('landing-feature-01').contains('오늘의 KBO').should('be.visible');
    cy.getBySel('landing-feature-02').scrollIntoView();
    cy.getBySel('landing-feature-02').contains('감이 아니라 데이터로').should('be.visible');
    cy.getBySel('landing-feature-03').scrollIntoView();
    cy.getBySel('landing-feature-03').contains('우리 팀의 순간을').should('be.visible');
    cy.getBySel('landing-feature-04').scrollIntoView();
    cy.getBySel('landing-feature-04').contains('혼자 가는 직관은').should('be.visible');
    cy.getBySel('landing-feature-05').scrollIntoView();
    cy.getBySel('landing-feature-05').contains('처음 가는 구장도').should('be.visible');
    cy.getBySel('landing-feature-06').scrollIntoView();
    cy.get('[data-testid^="landing-feature-0"]')
      .should('have.length', 6)
      .then(($features) => [...$features].map((feature) => feature.dataset.testid))
      .should('deep.equal', [
        'landing-feature-01',
        'landing-feature-02',
        'landing-feature-03',
        'landing-feature-04',
        'landing-feature-05',
        'landing-feature-06',
      ]);
    cy.getBySel('landing-feature-01').contains('LIVE · 7회말 · 잠실').should('be.visible');
    cy.getBySel('landing-feature-02').contains('64%').should('be.visible');
    cy.getBySel('landing-feature-03').contains('직관러버').should('be.visible');
    cy.getBySel('landing-feature-04').within(() => {
      cy.get('.landing-mate-matchup h3').should('have.text', 'LG vs 두산 · 잠실');
      cy.get('.landing-mate-details li')
        .then(($details) => [...$details].map((detail) => detail.textContent?.trim()))
        .should('deep.equal', ['2025.10.26(일) 18:30', '2/4명', '3루 응원석']);
      cy.get('.landing-mate-steps li')
        .then(($steps) => [...$steps].map((step) => step.textContent?.trim()))
        .should('deep.equal', ['신청', '승인', '채팅']);
      cy.get('.landing-mate-deposit')
        .should('have.text', '경기 당일 체크인으로 보증금을 환불받으세요');
    });
    cy.getBySel('landing-feature-05').within(() => {
      cy.get('.landing-feature-copy .landing-stadium-chips').should('have.length', 1);
      cy.get('.landing-feature-visual .landing-stadium-chips').should('not.exist');
      cy.get('[data-testid="landing-stadium-chip"]')
        .then(($chips) => [...$chips].map((chip) => chip.textContent?.trim()))
        .should('deep.equal', [
          '잠실',
          '고척',
          '문학',
          '수원',
          '대전',
          '대구',
          '사직',
          '창원',
          '광주',
        ]);
      cy.get('.landing-stadium-art figcaption')
        .should('have.text', '잠실야구장 · 서울종합운동장');
      cy.get('.landing-stadium-stats dd')
        .then(($stats) => [...$stats].map((stat) => stat.textContent?.trim()))
        .should('deep.equal', ['25,000', '32', '2호선']);
    });
    cy.getBySel('landing-feature-06').contains('승률 0.700').should('be.visible');
    cy.getBySel('landing-feature-06').within(() => {
      cy.get('[data-testid="landing-diary-result"]')
        .then(($results) => [...$results].map((result) => result.textContent?.trim()))
        .should('deep.equal', ['승', '승', '패', '승', '무', '승', '승', '패', '승', '승']);
      cy.get('.landing-diary-quote')
        .should('have.text', '10.26(일) 잠실 · 승 — “끝내기 직관. 목이 쉬었지만 후회는 없다”');
    });
  });

  it('keeps the stadium artwork covering its frame before and after scroll', () => {
    cy.viewport(1280, 900);
    visitLanding();

    const assertParallaxIsBounded = ($artwork: JQuery<HTMLElement>) => {
      const view = $artwork[0].ownerDocument.defaultView;
      if (!view) throw new Error('Missing stadium artwork window');

      const matrix = new view.DOMMatrixReadOnly(view.getComputedStyle($artwork[0]).transform);
      expect(Math.abs(matrix.m42), 'stadium artwork parallax offset').to.be.at.most(30);
    };

    const assertArtworkCoversFrame = ($frame: JQuery<HTMLElement>) => {
      const artwork = $frame[0].querySelector<HTMLImageElement>('img');
      if (!artwork) throw new Error('Missing stadium artwork');

      const frameRect = $frame[0].getBoundingClientRect();
      const artworkRect = artwork.getBoundingClientRect();
      expect(artworkRect.top, 'stadium artwork top edge').to.be.at.most(frameRect.top);
      expect(artworkRect.bottom, 'stadium artwork bottom edge').to.be.at.least(frameRect.bottom);
    };

    cy.window().then((win) => {
      win.scrollTo(0, 0);
      win.dispatchEvent(new win.Event('scroll'));
      return new Cypress.Promise<void>((resolve) => {
        win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
      });
    });
    cy.get('.landing-stadium-art img').should(assertParallaxIsBounded);
    cy.get('.landing-stadium-art').should(assertArtworkCoversFrame);
    cy.getBySel('landing-feature-05').scrollIntoView();
    cy.get('.landing-stadium-art img').should(assertParallaxIsBounded);
    cy.get('.landing-stadium-art').should(assertArtworkCoversFrame);
    cy.get('.landing-stadium-art').then(($frame) => {
      const win = $frame[0].ownerDocument.defaultView;
      if (!win) throw new Error('Missing stadium artwork window');

      const frameRect = $frame[0].getBoundingClientRect();
      win.document.documentElement.style.scrollBehavior = 'auto';
      win.scrollTo(0, win.scrollY + frameRect.top - 100);
      win.dispatchEvent(new win.Event('scroll'));
      return new Cypress.Promise<void>((resolve) => {
        win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
      });
    });
    cy.get('.landing-stadium-art').should(($frame) => {
      expect($frame[0].getBoundingClientRect().top, 'stadium frame top edge').to.be.closeTo(100, 1);
    });
    cy.get('.landing-stadium-art img').should(assertParallaxIsBounded);
    cy.get('.landing-stadium-art').should(assertArtworkCoversFrame);
  });

  it('keeps feature copy before its visual in the DOM while preserving responsive placement', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('[data-testid^="landing-feature-0"]').each(($section, index) => {
      const copy = $section[0].querySelector<HTMLElement>('.landing-feature-copy');
      const visual = $section[0].querySelector<HTMLElement>('.landing-feature-visual');
      if (!copy || !visual) throw new Error(`Missing feature blocks for section ${index + 1}`);

      expect(
        copy.compareDocumentPosition(visual) & Node.DOCUMENT_POSITION_FOLLOWING,
        `feature ${index + 1} copy precedes visual in document order`,
      ).not.to.equal(0);

      const copyLeft = copy.getBoundingClientRect().left;
      const visualLeft = visual.getBoundingClientRect().left;
      if (index % 2 === 0) {
        expect(copyLeft, `feature ${index + 1} desktop copy placement`).to.be.lessThan(visualLeft);
      } else {
        expect(visualLeft, `feature ${index + 1} desktop visual placement`).to.be.lessThan(copyLeft);
      }
    });

    cy.viewport(375, 812);
    cy.get('[data-testid^="landing-feature-0"]').each(($section, index) => {
      const copy = $section[0].querySelector<HTMLElement>('.landing-feature-copy');
      const visual = $section[0].querySelector<HTMLElement>('.landing-feature-visual');
      if (!copy || !visual) throw new Error(`Missing mobile feature blocks for section ${index + 1}`);
      expect(
        copy.getBoundingClientRect().top,
        `feature ${index + 1} mobile copy-first placement`,
      ).to.be.lessThan(visual.getBoundingClientRect().top);
    });
  });

  it('stacks every feature story into one column at the tablet breakpoint', () => {
    cy.viewport(768, 1024);
    visitLanding();

    cy.get('.landing-feature-inner').each(($inner, index) => {
      const columns = getComputedStyle($inner[0]).gridTemplateColumns.trim().split(/\s+/);
      expect(columns, `feature ${index + 1} tablet grid columns`).to.have.length(1);

      const copy = $inner[0].querySelector<HTMLElement>('.landing-feature-copy');
      const visual = $inner[0].querySelector<HTMLElement>('.landing-feature-visual');
      if (!copy || !visual) throw new Error(`Missing tablet feature blocks for section ${index + 1}`);
      expect(copy.getBoundingClientRect().top, `feature ${index + 1} tablet copy-first placement`)
        .to.be.lessThan(visual.getBoundingClientRect().top);
    });
  });

  it('keeps score-card team logos decorative when visible text names each team', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-phone-score-row img').should('have.length', 2).each(($logo) => {
      expect($logo).to.have.attr('alt', '');
    });
  });

  it('keeps inactive fixed-light phone tabs at readable contrast', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('.landing-phone-tabs').should('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('.landing-phone-tabs span:not(.landing-phone-tab-active)').each(($tab) => {
      const color = getComputedStyle($tab[0]).color;
      expect(contrastAgainstWhite(color), `${$tab.text()} contrast`).to.be.at.least(4.5);
    });
  });

  it('shows the final state and disables looping motion for reduced-motion visitors', () => {
    cy.viewport(1280, 900);
    visitLanding({ reducedMotion: true });

    cy.get('[data-motion-loop]').should(($node) => {
      expect(getComputedStyle($node[0]).animationName).to.equal('none');
    });
    cy.get('[data-reveal]').should('have.css', 'opacity', '1');
    cy.getBySel('landing-closing-mascot').should(($mascot) => {
      expect(getComputedStyle($mascot[0]).animationName).to.equal('none');
    });
    cy.getBySel('landing-closing').find('[data-reveal]').should('have.css', 'opacity', '1');
    cy.get('.landing-phone-progress [data-bar]').should(($bar) => {
      const style = getComputedStyle($bar[0]);
      expect(style.transitionDuration).to.equal('0s');
      expect(style.transitionDelay).to.equal('0s');
      expect($bar[0].style.width).to.equal('64%');
    });
  });

  it('finishes landing motion when reduced-motion changes after load', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-feature-02').then(($section) => {
      const reveal = $section[0].querySelector<HTMLElement>('.landing-feature-visual');
      const bar = $section[0].querySelector<HTMLElement>('.landing-prediction-track [data-bar]');
      expect(reveal?.dataset.revealed).not.to.equal('true');
      expect(bar?.style.width).to.equal('');
    });

    cy.then(() => emulateReducedMotion('reduce'));
    cy.window().should((win) => {
      expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
    });
    cy.getBySel('landing-feature-02').should(($section) => {
      const reveal = $section[0].querySelector<HTMLElement>('.landing-feature-visual');
      const bar = $section[0].querySelector<HTMLElement>('.landing-prediction-track [data-bar]');
      expect(reveal?.dataset.revealed).to.equal('true');
      expect(bar?.style.width).to.equal('64%');
    });
    cy.get('[data-motion-loop], [data-anim]').should(($nodes) => {
      expect([...$nodes].every((node) => getComputedStyle(node).animationName === 'none')).to.equal(true);
    });
    cy.then(() => emulateReducedMotion('no-preference'));
  });

  it('renders the offseason, semantic start guide, and mascot closing', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-page').children('[data-testid]').then(($sections) => (
      [...$sections].slice(-4).map((section) => section.getAttribute('data-testid'))
    )).should('deep.equal', [
      'landing-feature-06',
      'landing-offseason',
      'landing-start-guide',
      'landing-closing',
    ]);

    cy.getBySel('landing-offseason').scrollIntoView().within(() => {
      cy.contains('야구는 겨울에도 계속됩니다').should('be.visible');
      cy.get('.landing-final-description').should(
        'have.text',
        '오프시즌엔 스토브리그 인사이트로, 그리고 시즌 기록을 겨루는 복고풍 리더보드로.',
      );
      cy.contains('RETRO MODE').should('be.visible');
      cy.get('[data-testid="landing-offseason-chip"]')
        .then(($chips) => [...$chips].map((chip) => chip.textContent?.trim()))
        .should('deep.equal', ['FA 트래커', '캠프 리포트']);
      cy.get('.landing-offseason-insight').within(() => {
        cy.get('h3').should(($heading) => {
          expect(normalizedText($heading[0])).to.equal('스토브리그의 모든 소식, 데이터로 정리해드립니다');
        });
        cy.get('h3 + p').should(
          'have.text',
          'FA 이적 · 신인 드래프트 · 스프링캠프 리포트까지, 겨울에도 팬심이 식지 않도록.',
        );
      });
      cy.getBySel('landing-retro-card').within(() => {
        cy.get('h3').should(($heading) => {
          expect(normalizedText($heading[0])).to.equal('8-bit 리더보드에서 시즌 기록을 겨루세요');
        });
        cy.get('h3 + p').should('have.text', '직관 승률 · 예측 적중률 랭킹. 픽셀 야구장에서 만나요.');
        cy.getBySel('landing-retro-leaderboard').should(($leaderboard) => {
          expect($leaderboard[0].tagName).to.equal('OL');
        });
        cy.get('[data-testid="landing-retro-leaderboard"] > li').should('have.length', 3)
          .then(($rows) => [...$rows].map((row) => (
            [...row.children].map((cell) => normalizedText(cell)).join(' ')
          )))
          .should('deep.equal', [
            '1. TIGERS_V12 .712',
            '2. JIKGWAN_LOVER .700',
            '3. BEGA_FAN_01 .685',
          ]);
      });
    });

    cy.getBySel('landing-start-guide').scrollIntoView().within(() => {
      cy.contains('HOW TO START').should('be.visible');
      cy.contains('시작은 3분이면 충분해요').should('be.visible');
      cy.get('article').should('have.length', 3);
      cy.get('article h3')
        .then(($headings) => [...$headings].map((heading) => heading.textContent?.trim()))
        .should('deep.equal', [
          '응원 팀을 고르세요',
          '오늘 경기를 확인하세요',
          '직관을 기록하세요',
        ]);
      cy.get('article p')
        .then(($descriptions) => [...$descriptions].map((description) => normalizedText(description)))
        .should('deep.equal', [
          '10개 구단 중 내 팀을 선택하면 피드와 일정이 우리 팀 중심으로 정렬됩니다.',
          '실시간 스코어와 AI 승리 확률을 보고, 경기 전 예측에 참여해보세요.',
          '같이가요로 메이트를 만나고, 다녀온 경기는 직관일기에 남기세요.',
        ]);
    });

    cy.getBySel('landing-closing').scrollIntoView().within(() => {
      cy.get('img[alt="BEGA 마스코트"]').should('be.visible');
      cy.get('h2').should(($heading) => {
        expect(normalizedText($heading[0])).to.equal('야구팬의 하루가 전부 BEGA 안에 있습니다');
      });
      cy.get('h2 + p').should(($description) => {
        expect(normalizedText($description[0])).to.equal(
          '실시간 경기 정보부터 함께 갈 메이트까지, 시즌의 모든 순간을 함께하세요.',
        );
      });
      cy.getBySel('landing-closing-logo-chip').should(($chip) => {
        expect($chip[0].tagName).to.equal('DIV');
        expect($chip).not.to.have.attr('role');
        expect($chip).not.to.have.attr('tabindex');
      });
      cy.getBySel('landing-closing-logo-chip').find('button, a').should('not.exist');
    });

    cy.getBySel('landing-page').should(($landing) => {
      const interactive = getLandingInteractiveElements($landing[0]);
      const summary = interactive.map((element) => (
        `${element.tagName.toLowerCase()}[data-testid="${element.dataset.testid ?? ''}"] "${normalizedText(element)}"`
      )).join(', ');
      expect(interactive, `landing interactive elements: ${summary}`).to.have.length(2);
      expect(interactive.map((element) => element.dataset.testid)).to.have.members([
        'landing-ticker-toggle',
        'landing-home-cta',
      ]);
      const tickerToggle = interactive.find((element) => element.dataset.testid === 'landing-ticker-toggle');
      expect(tickerToggle?.tagName).to.equal('BUTTON');
      expect(normalizedText(tickerToggle as HTMLElement)).to.equal('티커 일시정지');
      const homeCta = interactive.find((element) => element.dataset.testid === 'landing-home-cta');
      expect(homeCta?.tagName).to.equal('BUTTON');
      expect(normalizedText(homeCta as HTMLElement)).to.equal('홈으로 이동');
    });
    cy.getBySel('landing-ticker-toggle').should('exist').and('be.visible').focus().should('have.focus');
  });

  it('lazy-loads and asynchronously decodes the below-fold closing mascot', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.getBySel('landing-closing-mascot')
      .should('have.attr', 'loading', 'lazy')
      .and('have.attr', 'decoding', 'async');
  });

  it('maps light sections to dark surfaces without changing fixed palettes', () => {
    cy.viewport(1280, 900);
    visitLanding({ theme: 'dark' });

    cy.getBySel('landing-offseason')
      .should('have.css', 'background-color', 'rgb(16, 18, 21)');
    cy.getBySel('landing-app-preview')
      .should('have.css', 'background-color', 'rgb(23, 59, 52)');
    cy.getBySel('landing-phone')
      .should('have.css', 'background-color', 'rgb(242, 242, 247)');
    cy.getBySel('landing-retro-card')
      .should('have.css', 'background-color', 'rgb(10, 10, 10)');
    cy.getBySel('landing-feature-01').within(() => {
      cy.get('h2').should('have.css', 'color', 'rgb(240, 243, 245)');
      cy.get('.landing-feature-description').should('have.css', 'color', 'rgb(154, 167, 177)');
      cy.get('.landing-vignette-card').first().should(($card) => {
        const style = getComputedStyle($card[0]);
        expect(style.backgroundColor).to.equal('rgb(22, 24, 28)');
        expect(style.borderColor).to.equal('rgba(255, 255, 255, 0.12)');
      });
    });
    cy.getBySel('landing-start-guide').find('article').first().should(($article) => {
      const style = getComputedStyle($article[0]);
      expect(style.backgroundColor).to.equal('rgb(22, 24, 28)');
      expect(style.borderColor).to.equal('rgba(255, 255, 255, 0.12)');
    });
    cy.get('.landing-offseason-insight').should('have.attr', 'data-fixed-theme');
    cy.getBySel('landing-retro-card').should('have.attr', 'data-fixed-theme');
    cy.getBySel('landing-closing').should('have.attr', 'data-fixed-theme');
  });

  it('keeps dark diary result text at WCAG AA contrast after background compositing', () => {
    cy.viewport(1280, 900);
    visitLanding({ theme: 'dark' });

    cy.getBySel('landing-feature-06').scrollIntoView();
    cy.getBySel('landing-feature-06').should(($section) => {
      const ratios = [
        ['win', '.landing-diary-result-win'],
        ['draw', '.landing-diary-result-draw'],
        ['loss', '.landing-diary-result-loss'],
      ].map(([label, selector]) => {
        const element = $section[0].querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing diary result tone: ${label}`);
        const background = effectiveBackgroundColor(element);
        const foreground = compositeColor(parseCssColor(getComputedStyle(element).color), background);
        return { label, ratio: contrastRatio(foreground, background) };
      });

      const summary = ratios.map(({ label, ratio }) => `${label} ${ratio.toFixed(2)}:1`).join(', ');
      expect(
        ratios.filter(({ ratio }) => ratio < 4.5).map(({ label }) => label),
        `composited contrast: ${summary}`,
      ).to.deep.equal([]);
    });
  });

  it('keeps every light status, prediction, and diary foreground at WCAG AA contrast after compositing', () => {
    cy.viewport(1280, 900);
    visitLanding({ theme: 'light' });

    const contrastTargets = [
      ['phone LIVE', '.landing-phone-live'],
      ['phone game status', '.landing-phone-card-kicker'],
      ['feature game status', '[data-testid="landing-feature-01"] .landing-game-live'],
      ['cheer like count', '[data-testid="landing-feature-03"] .landing-cheer-liked'],
      ['prediction 36%', '[data-testid="landing-feature-02"] .landing-prediction-team-away strong'],
      ['prediction VS', '[data-testid="landing-feature-02"] .landing-prediction-matchup > i'],
      ['diary result', '[data-testid="landing-feature-06"] [data-testid="landing-diary-result"]'],
      ['diary quote', '[data-testid="landing-feature-06"] .landing-diary-quote'],
      ['diary quote span', '[data-testid="landing-feature-06"] .landing-diary-quote span'],
      ['diary quote result', '[data-testid="landing-feature-06"] .landing-diary-quote strong'],
    ] as const;

    const ratios: Array<{ label: string; ratio: number }> = [];
    contrastTargets.forEach(([label, selector]) => {
      cy.get(selector).each(($element, index) => {
        ratios.push({
          label: `${label} ${index + 1}`,
          ratio: compositedTextContrast($element[0]),
        });
      });
    });

    cy.then(() => {
      const summary = ratios.map(({ label, ratio }) => `${label} ${ratio.toFixed(2)}:1`).join(', ');
      expect(
        ratios.filter(({ ratio }) => ratio < 4.5).map(({ label }) => label),
        `light composited contrast: ${summary}`,
      ).to.deep.equal([]);
    });
  });

  it('fits the complete landing and phone at 375 by 812 without horizontal overflow', () => {
    cy.viewport(375, 812);
    visitLanding();

    cy.getBySel('landing-closing').scrollIntoView().should('be.visible');
    assertNoHorizontalOverflow();
    cy.getBySel('landing-ticker-toggle').should('be.visible').focus().should('have.focus');
    cy.getBySel('landing-phone').should(($phone) => {
      expect($phone[0].getBoundingClientRect().width).to.be.at.most(347);
    });
  });

  it('owns only the Press Start font link it creates', () => {
    cy.viewport(1280, 900);
    visitLanding();

    cy.get('head link#retro-font-press-start')
      .should('have.length', 1)
      .and('have.attr', 'href')
      .and('include', 'family=Press+Start+2P');

    cy.window().then((win) => {
      win.history.pushState({}, '', '/login');
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
    cy.getBySel('landing-page').should('not.exist');
    cy.get('head link#retro-font-press-start').should('not.exist');

    visitLanding({ seedPressStartFont: true });
    cy.get('head link#retro-font-press-start')
      .should('have.length', 1)
      .and('have.attr', 'data-test-owner', 'existing');
    cy.window().then((win) => {
      win.history.pushState({}, '', '/login');
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
    cy.getBySel('landing-page').should('not.exist');
    cy.get('head link#retro-font-press-start')
      .should('have.length', 1)
      .and('have.attr', 'data-test-owner', 'existing');
  });
});
