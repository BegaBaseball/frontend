import { useMemo, type SVGProps } from 'react';

import { createQrMatrix, createQrPath, type QrErrorCorrectionLevel } from '../../utils/qr';

interface QrCodeSvgProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  value: string;
  size?: number;
  level?: QrErrorCorrectionLevel;
  fgColor?: string;
  bgColor?: string;
}

export default function QrCodeSvg({
  value,
  size = 256,
  level = 'Q',
  fgColor = '#000000',
  bgColor = '#ffffff',
  ...props
}: QrCodeSvgProps) {
  const { modulePath, moduleCount } = useMemo(() => {
    const matrix = createQrMatrix(value, level);

    return {
      modulePath: createQrPath(matrix),
      moduleCount: matrix.length,
    };
  }, [level, value]);

  return (
    <svg
      aria-label="QR code"
      height={size}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect fill={bgColor} height={moduleCount} width={moduleCount} x={0} y={0} />
      <path d={modulePath} fill={fgColor} />
    </svg>
  );
}
