import { useState } from 'react';

import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';
import { SettingsSwitch } from './SettingsSwitch';

type NotificationSetting = {
  label: string;
  description?: string;
  initialValue: boolean;
};

const NOTIFICATIONS: readonly NotificationSetting[] = [
  {
    label: '근처 쪽지 알림',
    description: '반경 200m 안에 쪽지가 생기면 알려줘요',
    initialValue: true,
  },
  {
    label: '친구 쪽지 알림',
    description: '친구가 새 쪽지를 남기면 알려줘요',
    initialValue: true,
  },
  { label: '마케팅 정보 수신', initialValue: false },
];

function NotificationRow({ label, description, initialValue }: NotificationSetting) {
  const [enabled, setEnabled] = useState(initialValue);

  return (
    <SettingsRow
      label={label}
      description={description}
      trailing={<SettingsSwitch label={label} value={enabled} onValueChange={setEnabled} />}
    />
  );
}

export function SettingsNotifications() {
  return (
    <SettingsSection title="알림">
      {NOTIFICATIONS.map((setting) => <NotificationRow key={setting.label} {...setting} />)}
    </SettingsSection>
  );
}
