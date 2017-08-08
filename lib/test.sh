#!/bin/bash
version="2010-12-30"
format="json" # xml is also a valid option
action="list-instances"
base_url="https://cloudapi.atlantic.net/?"

ACCESS_KEY="ATL391a8a0a3819af5ad6f69a9df4d67c95"
private_key="64ebbe0da570561cd106064da41eef44b3c741ba"

random_guid=$(uuidgen|tr '[:upper:]' '[:lower:]')
echo "${random_guid}"
time_since_epoch=$(date +%s)
string_to_sign="${time_since_epoch}${random_guid}"
signature=$(echo -n "${string_to_sign}" | openssl dgst -sha256 -hmac "${private_key}" -binary | openssl enc -base64)
signature="$(perl -MURI::Escape -e 'print uri_escape($ARGV[0]);' "${signature}")"
url="https://cloudapi.atlantic.net/?&Action=${action}&Format=${format}&Version=${version}&ACSAccessKeyId=${ACCESS_KEY}"
echo ${url}
curl "${url}"


curl https://cloudapi.atlantic.net/?Action=list-instances \
-d Format=json \
-d Version=2010-12-30 \
-d ACSAccessKeyId=$ACCESS_KEY \
-d Timestamp=$time_since_epoch \
-d Rndguid=$random_guid \
-d Signature=$signature \
 | python -m json.tool
