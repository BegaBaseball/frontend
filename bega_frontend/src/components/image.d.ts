// 일반적인 .png 파일 처리
declare module '*.png' {
  const content: string;
  export default content;
}

// figma:asset/ 접두사가 붙은 경로 처리 (이 에러 해결을 위한 핵심)
declare module 'figma:asset/*.png' {
  const content: string;
  export default content;
}