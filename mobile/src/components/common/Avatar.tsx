/**
 * 공통 아바타 컴포넌트
 */

import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { colors, typography } from '../../styles/theme';

interface AvatarProps {
  source?: ImageSourcePropType | string;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  online?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'medium',
  online,
  style,
}) => {
  const avatarSize = sizeMap[size];
  const onlineIndicatorSize = avatarSize / 4;

  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`
      : names[0][0];
  };

  const renderAvatar = () => {
    if (source) {
      const imageSource =
        typeof source === 'string' ? { uri: source } : source;

      return (
        <Image
          source={imageSource}
          style={[styles.image, { width: avatarSize, height: avatarSize }]}
        />
      );
    }

    if (name) {
      return (
        <View
          style={[
            styles.placeholder,
            { width: avatarSize, height: avatarSize },
          ]}
        >
          <Text style={[styles.placeholderText, { fontSize: avatarSize / 2.5 }]}>
            {getInitials(name)}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.placeholder,
          { width: avatarSize, height: avatarSize },
        ]}
      >
        <Text style={[styles.placeholderText, { fontSize: avatarSize / 2 }]}>
          ?
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderAvatar()}
      {online !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: onlineIndicatorSize,
              height: onlineIndicatorSize,
              borderRadius: onlineIndicatorSize / 2,
              backgroundColor: online ? colors.online : colors.offline,
            },
          ]}
        />
      )}
    </View>
  );
};

const sizeMap = {
  small: 40,
  medium: 60,
  large: 80,
  xlarge: 120,
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 9999,
  },
  placeholder: {
    borderRadius: 9999,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
