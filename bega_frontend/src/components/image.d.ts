// 예시 파일: custom.d.ts 또는 images.d.ts

// 1. 일반적인 .png 파일을 문자열로 인식하도록 선언
declare module '*.png' {
  const content: string;
  export default content;
}

// 2. figma:asset/ 접두사가 붙은 .png 파일도 문자열로 인식하도록 선언
declare module 'figma:asset/*.png' {
  const content: string;
  export default content;
}