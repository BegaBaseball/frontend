import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInningTeamNameStyle,
  getInningMetaTextStyle,
  getSectionHeadingTextStyle,
  getTeamLabelTextStyle,
  getTopScoreTextStyle,
} from './advancedMatchCardStyles';
import {
  getPredictionInningTextColor,
  PREDICTION_DARK_MODE_TEXT_OVERRIDES,
  PREDICTION_TEAM_NAME_FONT_WEIGHT,
  PREDICTION_TEAM_NAME_LETTER_SPACING,
  PREDICTION_META_TEXT_COLOR_DARK,
  PREDICTION_META_TEXT_COLOR_LIGHT,
  PREDICTION_META_TEXT_FONT_WEIGHT,
} from './predictionTextStylePolicy';

test('getPredictionInningTextColor: 다크모드에서 팀 컬러 예외 규칙을 적용한다', () => {
  assert.equal(
    getPredictionInningTextColor('#131230', true),
    PREDICTION_DARK_MODE_TEXT_OVERRIDES['#131230']
  );
  assert.equal(
    getPredictionInningTextColor('#041E42', true),
    PREDICTION_DARK_MODE_TEXT_OVERRIDES['#041E42']
  );
  assert.equal(
    getPredictionInningTextColor('#000000', true),
    PREDICTION_DARK_MODE_TEXT_OVERRIDES['#000000']
  );
});

test('getPredictionInningTextColor: 라이트모드는 입력 색상 그대로 반환한다', () => {
  assert.equal(getPredictionInningTextColor('#041E42', false), '#041E42');
});

test('getPredictionInningTextColor: 예외 미등록 팀은 다크모드에서도 원색 유지', () => {
  assert.equal(getPredictionInningTextColor('#F37321', true), '#F37321');
});

test('getInningTeamNameStyle: 다크모드에서 두산/롯데/KT는 가독성 강화 색상으로 전환한다', () => {
  const doosanStyle = getInningTeamNameStyle('#131230', true);
  const lotteStyle = getInningTeamNameStyle('#041E42', true);
  const ktStyle = getInningTeamNameStyle('#000000', true);

  assert.equal(doosanStyle.color, '#FFFFFF');
  assert.equal(lotteStyle.color, '#FFFFFF');
  assert.equal(ktStyle.color, '#FFFFFF');
  assert.equal(doosanStyle.WebkitTextStroke, undefined);
  assert.equal(doosanStyle.WebkitTextFillColor, undefined);
  assert.equal(lotteStyle.WebkitTextStroke, undefined);
  assert.equal(lotteStyle.WebkitTextFillColor, undefined);
  assert.equal(ktStyle.WebkitTextStroke, undefined);
  assert.equal(ktStyle.WebkitTextFillColor, undefined);
});

test('getInningTeamNameStyle: 라이트모드에서는 원본 팀 색상을 유지한다', () => {
  const style = getInningTeamNameStyle('#131230', false);

  assert.equal(style.color, '#131230');
  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.letterSpacing, PREDICTION_TEAM_NAME_LETTER_SPACING);
  assert.equal(style.textRendering, 'optimizeLegibility');
});

test('getInningTeamNameStyle: 다크모드에서 비대상 팀은 원본 색상 유지', () => {
  const style = getInningTeamNameStyle('#F37321', true);

  assert.equal(style.color, '#F37321');
  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.letterSpacing, PREDICTION_TEAM_NAME_LETTER_SPACING);
  assert.equal(style.textRendering, 'optimizeLegibility');
});

test('getTopScoreTextStyle: 다크모드에서도 단색 텍스트만 처리한다', () => {
  const style = getTopScoreTextStyle('#041E42', true);

  assert.equal(style.color, '#FFFFFF');
  assert.equal(style.WebkitTextStroke, undefined);
  assert.equal(style.WebkitTextFillColor, undefined);
  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.textRendering, 'optimizeLegibility');
});

test('getTopScoreTextStyle: 다크모드에서 KT도 가독성 강화 색상으로 처리한다', () => {
  const style = getTopScoreTextStyle('#000000', true);

  assert.equal(style.color, '#FFFFFF');
  assert.equal(style.WebkitTextStroke, undefined);
  assert.equal(style.WebkitTextFillColor, undefined);
  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.textRendering, 'optimizeLegibility');
});

test('getTopScoreTextStyle: 라이트모드에서도 단색 텍스트 규칙을 유지한다', () => {
  const style = getTopScoreTextStyle('#041E42', false);

  assert.equal(style.WebkitTextStroke, undefined);
  assert.equal(style.WebkitTextFillColor, undefined);
  assert.equal(style.color, '#041E42');
  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.textRendering, 'optimizeLegibility');
});

test('getInningMetaTextStyle: 라이트/다크 모드 각각 규칙색상과 가독성을 유지한다', () => {
  const light = getInningMetaTextStyle(false);
  const dark = getInningMetaTextStyle(true);

  assert.equal(light.color, PREDICTION_META_TEXT_COLOR_LIGHT);
  assert.equal(light.fontWeight, PREDICTION_META_TEXT_FONT_WEIGHT);
  assert.equal(light.textRendering, 'optimizeLegibility');

  assert.equal(dark.color, PREDICTION_META_TEXT_COLOR_DARK);
  assert.equal(dark.fontWeight, PREDICTION_META_TEXT_FONT_WEIGHT);
  assert.equal(dark.textRendering, 'optimizeLegibility');
});

test('getTeamLabelTextStyle: 팀명 라벨은 굵기/자간/렌더링 정책을 공유한다', () => {
  const style = getTeamLabelTextStyle();

  assert.equal(style.fontWeight, PREDICTION_TEAM_NAME_FONT_WEIGHT);
  assert.equal(style.letterSpacing, PREDICTION_TEAM_NAME_LETTER_SPACING);
  assert.equal(style.textRendering, 'optimizeLegibility');
  assert.equal(style.color, undefined);
});

test('getTeamLabelTextStyle: 다크모드에서 두산/롯데/KT는 팀명 라벨 색상을 보강한다', () => {
  const doosanLabelStyle = getTeamLabelTextStyle('#131230', true);
  const lotteLabelStyle = getTeamLabelTextStyle('#041E42', true);
  const ktLabelStyle = getTeamLabelTextStyle('#000000', true);

  assert.equal(doosanLabelStyle.color, '#FFFFFF');
  assert.equal(lotteLabelStyle.color, '#FFFFFF');
  assert.equal(ktLabelStyle.color, '#FFFFFF');
});

test('getTeamLabelTextStyle: 라이트모드에는 라벨 색상을 부여하지 않는다', () => {
  const darkTeamLabelStyle = getTeamLabelTextStyle('#131230', false);

  assert.equal(darkTeamLabelStyle.color, undefined);
});

test('getSectionHeadingTextStyle: 다크/라이트 모두 외곽선 없이 폰트만 설정한다', () => {
  const darkStyle = getSectionHeadingTextStyle(true);
  const lightStyle = getSectionHeadingTextStyle(false);

  assert.equal(darkStyle.WebkitTextStroke, undefined);
  assert.equal(darkStyle.WebkitTextFillColor, undefined);
  assert.equal(darkStyle.fontWeight, 700);
  assert.equal(darkStyle.textRendering, 'optimizeLegibility');

  assert.equal(lightStyle.WebkitTextStroke, undefined);
  assert.equal(lightStyle.WebkitTextFillColor, undefined);
  assert.equal(lightStyle.fontWeight, 700);
  assert.equal(lightStyle.textRendering, 'optimizeLegibility');
});
