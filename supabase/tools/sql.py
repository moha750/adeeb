import json,sys,os,urllib.request
REF="nnlhkfeybyhvlinbqqfa"
def tok():
    for line in open("/Users/m7_almattar/adeeb/v2/apps/web/.env.local",encoding="utf-8"):
        if line.startswith("SUPABASE_ACCESS_TOKEN="):
            return line.split("=",1)[1].strip().strip('"').strip("'")
    raise SystemExit("no token")
def run(q):
    req=urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query":q}).encode(),
        headers={"Authorization":"Bearer "+tok(),"Content-Type":"application/json","User-Agent":"curl/8.7.1"},
        method="POST")
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode() or "[]")
    except urllib.error.HTTPError as e:
        body=e.read().decode()
        print("HTTP",e.code,body[:900],file=sys.stderr); raise SystemExit(1)
if __name__=="__main__":
    a=sys.argv[1]
    q=open(a,encoding="utf-8").read() if os.path.exists(a) else a
    out=run(q)
    print(json.dumps(out,ensure_ascii=False,indent=1))
