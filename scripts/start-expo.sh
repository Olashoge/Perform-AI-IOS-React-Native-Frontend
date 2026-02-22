#!/bin/bash
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN}:5000"
exec npx expo start --tunnel --clear
