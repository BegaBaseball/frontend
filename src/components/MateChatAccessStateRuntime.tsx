import type { ReactNode } from 'react';

import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MateAlertCircleIcon, MateChevronLeftIcon, MateInfoIcon } from './MateIcons';
import {
  mateInsetPanelClass,
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';

type MateChatAccessStateRuntimeProps =
  | {
      state: 'partyError';
      message: string;
      partyId?: string;
    }
  | {
      state: 'unauthenticated';
      partyId?: string;
    }
  | {
      state: 'approvalError';
      message: string;
      partyId?: string;
      onRetry: () => void;
    }
  | {
      state: 'notApproved';
      partyId?: string;
    };

function MateChatStateLayout({ children }: { children: ReactNode }) {
  return (
    <div className={matePageShellClass}>
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top pointer-events-none opacity-30"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export default function MateChatAccessStateRuntime(props: MateChatAccessStateRuntimeProps) {
  const navigate = useNavigate();
  const detailPath = props.partyId ? `/mate/${props.partyId}` : '/mate';

  if (props.state === 'partyError') {
    return (
      <MateChatStateLayout>
        <Card className={`p-6 ${mateSectionCardClass}`}>
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
            <MateInfoIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              {props.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/mate')} className="mt-4 w-fit">
            목록으로 돌아가기
          </Button>
        </Card>
      </MateChatStateLayout>
    );
  }

  if (props.state === 'unauthenticated') {
    return (
      <MateChatStateLayout>
        <Card className={`p-6 ${mateSectionCardClass}`}>
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
            <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-300">
              로그인이 필요합니다. 로그인 후 이용해주세요.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))} className="mt-4 w-fit">
            로그인하기
          </Button>
        </Card>
      </MateChatStateLayout>
    );
  }

  if (props.state === 'approvalError') {
    return (
      <MateChatStateLayout>
        <Card className={`p-6 ${mateSectionCardClass}`}>
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25">
            <MateAlertCircleIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {props.message}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={props.onRetry}>
              다시 시도
            </Button>
            <Button onClick={() => navigate(detailPath)}>
              상세로 돌아가기
            </Button>
          </div>
        </Card>
      </MateChatStateLayout>
    );
  }

  return (
    <MateChatStateLayout>
      <Button
        variant="ghost"
        onClick={() => navigate(detailPath)}
        className="mb-4"
      >
        <MateChevronLeftIcon className="mr-2 h-4 w-4" />
        뒤로
      </Button>
      <Card className={`p-6 ${mateSectionCardClass}`}>
        <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
          Chat Access
        </p>
        <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">승인 전에는 채팅이 열리지 않습니다</h1>
        <p className="mt-3 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
          호스트의 승인을 기다려주세요. 승인 후에는 이 화면에서 만날 시간, 장소, 체크인 준비를 바로 조율할 수 있습니다.
        </p>
        <div className={`${mateInsetPanelClass} mt-4 p-4 text-[16px] text-gray-600 dark:text-gray-300`}>
          승인 전에는 채팅 기록 조회와 메시지 전송이 모두 제한됩니다.
        </div>
        <Button onClick={() => navigate(detailPath)} className="mt-6 w-fit">
          상세로 돌아가기
        </Button>
      </Card>
    </MateChatStateLayout>
  );
}
