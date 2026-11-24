#!/bin/sh
# 배포할 때마다 새 버전을 붙인다. 열려 있는 화면은 version.txt가 바뀐 걸 보고 스스로 새로 불러온다.
v=$(date +%m%d%H%M)
sed -i -E "s/(portfolio|views|chat)\.js(\?v=[0-9]+)?\"/\1.js?v=$v\"/g" index.html
sed -i -E "s/const APPVER='[0-9]*'/const APPVER='$v'/" index.html
printf '%s' "$v" > version.txt
