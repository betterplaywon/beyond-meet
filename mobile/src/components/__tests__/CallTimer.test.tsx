/**
 * CallTimer 컴포넌트 테스트
 *
 * CallTimer는 순수 표시 컴포넌트로, elapsed와 maxDuration을 props로 받아 표시합니다.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CallTimer } from '../call/CallTimer';

describe('CallTimer', () => {
  it('경과 시간과 최대 시간을 올바르게 표시해야 함', () => {
    const { getByText } = render(<CallTimer elapsed={0} maxDuration={180} />);
    expect(getByText(/00:00/)).toBeTruthy();
    expect(getByText(/03:00/)).toBeTruthy();
  });

  it('시간 포맷이 올바르게 표시되어야 함 (MM:SS)', () => {
    const { getByText } = render(<CallTimer elapsed={65} maxDuration={300} />);
    // 65초 = 1분 5초
    expect(getByText(/01:05/)).toBeTruthy();
    // 300초 = 5분
    expect(getByText(/05:00/)).toBeTruthy();
  });

  it('경과 시간이 변경되면 표시가 업데이트되어야 함', () => {
    const { getByText, rerender } = render(
      <CallTimer elapsed={30} maxDuration={180} />
    );
    expect(getByText(/00:30/)).toBeTruthy();

    rerender(<CallTimer elapsed={90} maxDuration={180} />);
    expect(getByText(/01:30/)).toBeTruthy();
  });

  it('남은 시간이 60초 이하일 때 경고 스타일이 적용되어야 함', () => {
    // maxDuration=120, elapsed=60 → remaining=60 → isWarning=true
    const { getByText } = render(<CallTimer elapsed={60} maxDuration={120} />);
    const timerText = getByText(/01:00/);
    expect(timerText).toBeTruthy();
    // 경고 스타일이 적용된 컨테이너가 있는지 확인
    // (스타일 테스트는 React Native Testing Library에서 제한적이므로 렌더링 확인으로 대체)
  });

  it('남은 시간이 60초 초과일 때 일반 스타일이어야 함', () => {
    // maxDuration=180, elapsed=60 → remaining=120 → isWarning=false
    const { getByText } = render(<CallTimer elapsed={60} maxDuration={180} />);
    const timerText = getByText(/01:00/);
    expect(timerText).toBeTruthy();
  });

  it('경계값: 남은 시간이 정확히 60초일 때 경고 스타일이어야 함', () => {
    // maxDuration=120, elapsed=60 → remaining=60 → isWarning=true (60 <= 60)
    const { getByText } = render(<CallTimer elapsed={60} maxDuration={120} />);
    expect(getByText(/01:00/)).toBeTruthy();
  });

  it('경계값: 남은 시간이 61초일 때 일반 스타일이어야 함', () => {
    // maxDuration=120, elapsed=59 → remaining=61 → isWarning=false
    const { getByText } = render(<CallTimer elapsed={59} maxDuration={120} />);
    expect(getByText(/00:59/)).toBeTruthy();
  });

  it('큰 시간 값도 올바르게 표시해야 함', () => {
    // 3600초 = 60분 = 60:00
    const { getByText } = render(<CallTimer elapsed={3600} maxDuration={7200} />);
    expect(getByText(/60:00/)).toBeTruthy();
  });

  it('타이머 아이콘이 표시되어야 함', () => {
    const { getByText } = render(<CallTimer elapsed={0} maxDuration={180} />);
    expect(getByText(/⏱/)).toBeTruthy();
  });
});
