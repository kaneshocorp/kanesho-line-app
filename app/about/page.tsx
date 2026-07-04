export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <div className="page">
      <header className="us-hd">
        <div className="co">有限会社金山商店</div>
        <h1>会社概要</h1>
      </header>

      <section className="us-card">
        <div className="cap">
          <span>ごあいさつ</span>
        </div>
        <div className="acc">
          昭和60年創業の有限会社金山商店は、山口県岩国市を拠点に、鋼材原料の加工および販売、計量を主な事業としております。
          「きちんと計量」をモットーに、地域の皆様に信頼していただけるリサイクル事業を続けてまいりました。
        </div>
      </section>

      <section className="us-card">
        <div className="cap">
          <span>会社概要</span>
        </div>
        <div className="acc">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "6px 0", color: "var(--ink2)", whiteSpace: "nowrap", verticalAlign: "top" }}>会社名</td>
                <td style={{ padding: "6px 0", paddingLeft: 12 }}>有限会社金山商店</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "var(--ink2)", whiteSpace: "nowrap", verticalAlign: "top" }}>設立</td>
                <td style={{ padding: "6px 0", paddingLeft: 12 }}>昭和60年6月1日</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "var(--ink2)", whiteSpace: "nowrap", verticalAlign: "top" }}>所在地</td>
                <td style={{ padding: "6px 0", paddingLeft: 12 }}>〒740-0002 山口県岩国市新港町2丁目5-30</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "var(--ink2)", whiteSpace: "nowrap", verticalAlign: "top" }}>事業内容</td>
                <td style={{ padding: "6px 0", paddingLeft: 12 }}>鋼材原料の加工及び販売、計量</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "var(--ink2)", whiteSpace: "nowrap", verticalAlign: "top" }}>電話番号</td>
                <td style={{ padding: "6px 0", paddingLeft: 12 }}>0827-22-7580</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="us-card">
        <div className="cap">
          <span>お問い合わせ</span>
        </div>
        <div className="acc">
          <span className="lm">JR岩国駅から車で約5分・道路向かいに釣具店と餃子の王将</span>
          <a className="call" href="tel:0827-22-7580">
            0827-22-7580 に電話する
          </a>
          <a
            className="maplink"
            href="https://maps.app.goo.gl/SmSwpLT9U1drWpYf7"
            target="_blank"
            rel="noopener noreferrer"
          >
            地図を開く
          </a>
        </div>
      </section>

      <p className="us-note">
        金属以外（木・紙・プラスチック・ゴム・家電・ごみ等）はお引き受けできません。大口・引き取りのご相談はお電話ください。
      </p>
    </div>
  );
}
