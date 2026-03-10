#!/bin/bash
export EXPO_PACKAGER_PROXY_URL="https://$REPLIT_DEV_DOMAIN"
export REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN"
export EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN:5000"
export EXPO_NO_CAPABILITY_SYNC=1

exec npx expo start --localhost < <(
  while true; do
    sleep 2
    printf '\033[B\n'
  done
)
