#!/bin/sh
# 배포할 때마다 스크립트 주소에 새 버전을 붙여, 휴대폰이 옛 파일과 새 파일을 섞어 쓰지 않게 한다.
v=$(date +%m%d%H%M)
sed -i -E "s/(portfolio|views|chat)\.js(\?v=[0-9]+)?\"/\1.js?v=$v\"/g" index.html
