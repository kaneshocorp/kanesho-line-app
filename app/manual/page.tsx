"use client";

import styles from "./manual.module.css";

export default function ManualPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
          この画面を印刷する
        </button>
      </div>

      <div className={styles.sheet}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>有限会社金山商店</div>
          <h1>管理画面 操作マニュアル</h1>
          <p>
            買取価格LINE配信アプリの管理画面を、はじめて使う方のためのご案内です。パソコンでもスマートフォンでも操作できます。特別なソフトの取り付けは必要ありません。
          </p>
        </header>

        <nav className={styles.toc}>
          <div className={styles.tocLabel}>目次</div>
          <ol>
            <li><a href="#intro">はじめに</a></li>
            <li><a href="#setup">1. セットアップ（はじめての方向け）</a></li>
            <li><a href="#overview">2. 画面の見かた</a></li>
            <li><a href="#tab-price">3-1. 価格配信</a></li>
            <li><a href="#tab-items">3-2. 品目管理</a></li>
            <li><a href="#tab-calendar">3-3. 営業カレンダー</a></li>
            <li><a href="#tab-friends">3-4. 友だち</a></li>
            <li><a href="#tab-consultation">3-5. 個別相談</a></li>
            <li><a href="#tab-announce">3-6. お知らせ</a></li>
            <li><a href="#faq">4. よくあるトラブル / Q&amp;A</a></li>
            <li><a href="#contact">5. こまったときの連絡先</a></li>
          </ol>
        </nav>

        <main className={styles.main}>
          <section id="intro" className={styles.section}>
            <h2>はじめに</h2>
            <p>
              この管理画面は、金山商店の「買取価格LINE配信アプリ」を操作するための画面です。毎日の買取価格の入力とLINE配信、営業カレンダーの管理、お客様（LINE友だち）の確認、個別相談の対応、お知らせの配信などを、事務員の方がパソコンやスマートフォンだけで行うことができます。特別なソフトの取り付けは必要ありません。
            </p>
          </section>

          <section id="setup" className={styles.section}>
            <h2>1. セットアップ（はじめての方向け）</h2>
            <p>
              この管理画面には専用アプリはありませんが、パソコンの画面に「デスクトップアプリ」のようなアイコンを作ることができます。一度セットアップすれば、次回からはそのアイコンをダブルクリックするだけで開けます。Chromeを開いてブックマークを探す必要はありません。
            </p>

            <div className={styles.methodTabs}>
              <div className={styles.methodCard}>
                <div className={styles.mHead}>🖥️ Windowsのパソコン（事務員の方はこちら）</div>
                <ol className={styles.setupSteps} style={{ margin: 0 }}>
                  <li className={styles.step}>
                    <span className={styles.num}>1</span>
                    <div className={styles.stepBody}>
                      <p>Google Chromeを開き、アドレス欄に次のURLを入力してEnterキーを押します。</p>
                    </div>
                  </li>
                </ol>
                <div className={styles.urlBox}>https://kanesho-line-app.vercel.app/admin</div>
                <ol className={styles.setupSteps} start={2}>
                  <li className={styles.step}>
                    <span className={styles.num}>2</span>
                    <div className={styles.stepBody}>
                      <p>
                        アドレス欄の右はしに「⊕」や画面のようなマークの<strong>インストールボタン</strong>
                        が出ていたら、それをクリックします。
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>3</span>
                    <div className={styles.stepBody}>
                      <p>
                        見当たらない場合は、右上の「⋮」（点3つ）のメニューを開き、「
                        <strong>金山商店 管理画面をインストール</strong>」または「
                        <strong>アプリをインストール</strong>」を選びます。
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>4</span>
                    <div className={styles.stepBody}>
                      <p>確認画面が出るので「インストール」を押します。デスクトップに専用のアイコンが自動でできます。</p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>5</span>
                    <div className={styles.stepBody}>
                      <p>次回からはそのアイコンをダブルクリックするだけで開きます。アドレスバーのない、アプリのような専用の画面が開きます。</p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>6</span>
                    <div className={styles.stepBody}>
                      <p>
                        よく使う場合は、そのアイコンを右クリックして「<strong>タスクバーにピン留めする</strong>
                        」を選ぶと、画面下のバーからもすぐ開けます。
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
              <div className={styles.methodCard}>
                <div className={styles.mHead}>📱 スマートフォン（iPhone / Android）</div>
                <ol className={styles.setupSteps} style={{ margin: 0 }}>
                  <li className={styles.step}>
                    <span className={styles.num}>1</span>
                    <div className={styles.stepBody}>
                      <p>いつも使っているブラウザ（Safari、Chromeなど）で上と同じURLを開きます。</p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>2</span>
                    <div className={styles.stepBody}>
                      <p>
                        iPhoneは共有ボタン（□に↑）→「ホーム画面に追加」。Androidは「⋮」メニュー→「ホーム画面に追加」または「アプリをインストール」を選びます。
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.num}>3</span>
                    <div className={styles.stepBody}>
                      <p>ホーム画面にアイコンが追加されます。タップすると、他のアプリと同じようにすぐ開きます。</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <div className={`${styles.callout} ${styles.warn}`}>
              <span className={styles.calloutHead}>⚠ 注意</span>
              <p>
                この管理画面には、ログイン画面やパスワードがありません。これは不具合ではなく、事務員の方やご家族がすぐに操作できるようにするための、意図的な仕組みです。
              </p>
              <p>
                そのぶん、<strong>このURLを知っている人は誰でも価格を変更したり、お客様全員にLINE配信したりできてしまいます。</strong>
              </p>
              <p>
                URLやアプリのアイコンを、ホームページやSNS、誰でも見られる場所に載せることは絶対にしないでください。共有するときは、操作が必要なスタッフ本人だけに、個別のメッセージで伝えるようにしてください。パソコンを共用している場合は、アイコンが誰でもクリックできる状態になる点にも注意してください。
              </p>
            </div>
          </section>

          <section id="overview" className={styles.section}>
            <h2>2. 画面の見かた</h2>
            <p>管理画面を開くと、上部にタブ（見出しボタン）が並んでいます。左から順に次の6つです。</p>
            <ul className={styles.tabOverview}>
              <li><span className={styles.n}>価格配信</span><span>今日の買取価格を入力し、LINE友だち全員に配信します。</span></li>
              <li><span className={styles.n}>営業カレンダー</span><span>休業日・時短営業日を設定し、LINE友だちに告知します。</span></li>
              <li><span className={styles.n}>品目管理</span><span>価格を入力する品目（買取品目）の追加・並び替え・表示/非表示・削除を行います。</span></li>
              <li><span className={styles.n}>友だち</span><span>LINEのお客様（友だち）一覧の確認と、配信対象のオン/オフを行います。</span></li>
              <li><span className={styles.n}>個別相談</span><span>写真査定のご依頼や、個別のご相談メッセージに直接返信します。</span></li>
              <li><span className={styles.n}>お知らせ</span><span>価格・休業以外の自由な文章をLINE友だちに配信します。</span></li>
            </ul>
            <div className={styles.badgeNote}>
              <span className={styles.dot}></span>
              <span>
                <strong>個別相談</strong>タブには、まだ対応していない依頼があるときに、タブの文字の横に赤い丸印（バッジ）が表示されます。これが出ているときは、新しい相談が届いていますので、確認してください。
              </span>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. 各タブの使い方</h2>

            <div id="tab-price" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>1</span>価格配信</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>今日の買取価格を品目ごとに入力し、その内容をLINE友だち全員に一斉配信するためのタブです。</p>
              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「価格配信」タブを開くと、「品目一覧」というカードが表示されます。ここには「価格を入力すると自動保存されます」という案内があります。</li>
                <li>一覧には、品目管理で「表示中」になっている品目だけが、品目名と単位（例：円/kg）とともに1行ずつ並んでいます。</li>
                <li>価格を入力したい品目の入力欄に、数字を入力します。小数点（例：48.5）も入力できます。欄からタップ（クリック）を外した時点で、内容が自動的に確定・保存されます。</li>
                <li>
                  入力欄の右側には、前回配信した価格と比べた差が自動で表示されます。
                  <ul>
                    <li>「未入力」：まだ価格が入力されていません。</li>
                    <li>「未配信」：価格は入力されているが、一度も配信されていません。</li>
                    <li>「▲＋N」「▼N」「±0」：前回配信した価格と比べて、上がった・下がった・変わらないことを表します。</li>
                  </ul>
                </li>
                <li>価格の入力が終わったら、一覧の下にある「価格をプレビューして配信」ボタンを押します。</li>
                <li>画面下から「価格をプレビュー」というシートが開きます。「配信するとLINE友だち全員に届きます」という案内が表示されます。</li>
                <li>
                  シートには、前回の配信から実際に価格が変わった品目だけが「旧価格→新価格」の形で一覧表示されます。価格を入力していない表示中の品目がある場合は、「未入力のため配信されない品目：〇〇」として別に案内されます（0円として配信されることはなく、単に配信対象から外れるだけです）。
                </li>
                <li>内容を確認し、配信しない場合は「やめる」を押します。配信する場合は「配信する」を押します。</li>
                <li>送信中は「配信中…」と表示され、完了すると「配信しました（N人）」というメッセージ（トースト）が表示されます。</li>
              </ol>
              <div className={`${styles.callout} ${styles.warn}`}>
                <span className={styles.calloutHead}>⚠ 注意</span>
                <p>「配信する」を押すと、その時点でLINE友だち全員に価格情報が届きます。一度配信すると取り消すことはできません。押す前に価格の内容をよく確認してください。</p>
              </div>
            </div>

            <div id="tab-items" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>2</span>品目管理</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>
                価格配信タブで価格を入力できる「品目」の一覧を管理するタブです。品目の追加、名前の変更、並び替え、表示/非表示の切り替え、削除ができます。価格そのものはこのタブでは入力できません（価格の入力は「価格配信」タブのみで行います）。
              </p>
              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「品目管理」タブを開くと、「全品目（N）」というカードが表示されます。「非表示の品目もここに表示されます」という案内の通り、表示中・非表示のどちらの品目もここには一覧で出てきます。</li>
                <li>
                  各行には次のものがあります。
                  <ul>
                    <li>左側の「⋮⋮」（ドラッグハンドル）：押したまま上下にドラッグすると、品目の並び順を変更できます。この並び順は、価格配信タブや一般公開の価格ページの表示順にもそのまま反映されます。</li>
                    <li>品目名の入力欄：名前を書き換えて欄の外をタップすると自動的に保存され、「✓ 保存しました」という表示が1.5秒ほど出て確認できます。</li>
                    <li>「表示中」または「非表示」のボタン：タップするたびに切り替わります。「非表示」にすると、その品目は価格配信タブと一般公開ページには出なくなりますが、品目管理タブには残り続けます。</li>
                    <li>「削除」ボタン：押すと確認のポップアップ「『（品目名）』を削除します。よろしいですか？」が表示されます。</li>
                  </ul>
                </li>
                <li>新しい品目を追加するときは、一番下の「＋ 品目を追加」ボタンを押します。「作成中…」という仮の名前で行が追加されるので、すぐにタップして正しい品目名に書き換えてください。</li>
              </ol>
              <div className={`${styles.callout} ${styles.warn}`}>
                <span className={styles.calloutHead}>⚠ 注意</span>
                <p>「削除」ボタンで確認のポップアップに進み、削除を実行すると、その品目は完全に削除され元に戻せません。よく確認してから削除してください。</p>
              </div>
            </div>

            <div id="tab-calendar" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>3</span>営業カレンダー</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>
                休業日や時短営業日をカレンダー上で選び、その内容をLINE友だち全員に配信して、お客様に告知するためのタブです。日本の祝日や、月の第2・第4土曜日などの通常の休業は、手を触れなくても自動的にカレンダーに反映されます。
              </p>

              <h4 className={styles.mini}>カレンダーの自動判定のしくみ（触らなくても休業になる日について）</h4>
              <p>この管理画面では、何も設定しなくても、次の順番で自動的にその日の営業・休業が決まっています。</p>
              <ol>
                <li>まず一番優先されるのは「祝日」です。日本の祝日データに載っている日は、自動的に休業として扱われます。</li>
                <li>次に優先されるのは「第2・第4土曜日」です。祝日でなくても、その月の2回目・4回目の土曜日であれば自動的に休業になります。</li>
                <li>どちらにも当てはまらない日は、あらかじめ登録されている「定休曜日」の設定と照らし合わせ、その曜日が定休日であれば休業、そうでなければ通常営業になります。</li>
              </ol>
              <p>
                スタッフがカレンダー上で個別に「休業」や「時短営業」などを設定した日がある場合は、この自動判定よりも個別設定が必ず優先されます。たとえば本来休業のはずの第2土曜日でも、手動で「営業」に設定し直せばその日は営業扱いになりますし、逆に通常の営業日を臨時休業に変更することもできます。時短営業を設定した日は、その日ごとの開始・終了時刻が使われ、時刻を指定しなければ通常の営業時間がそのまま使われます。
              </p>
              <div className={`${styles.callout} ${styles.info}`}>
                <span className={styles.calloutHead}>※ 補足</span>
                <p>祝日の判定は祝日データのライブラリに頼っているため、来年以降の祝日など、データの更新が追いついていない年については、自動反映が漏れる場合があります。念のため大型連休の前などはカレンダー表示を目で確認してください。</p>
              </div>

              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「営業カレンダー」タブを開くと、当月のカレンダーが表示されます。「◀」「▶」ボタンで月を移動できます。</li>
                <li>上部の「休業にする」「時短にする」ボタンで、これから行いたい操作のモードを切り替えます（初期状態は「休業にする」です）。</li>
              </ol>

              <h4 className={styles.mini}>休業を設定して配信する場合</h4>
              <ol>
                <li>「休業にする」を選んだ状態で、カレンダー上の営業中の日付をタップします。複数の日をまとめて選ぶこともできます（もう一度タップすると選択解除できます）。</li>
                <li>画面下に浮かび上がるバー「〇件選択中 → 確定して配信」をタップします。</li>
                <li>「休業を確定して配信」というシートが開きます。選んだ日付と、自動で作られた配信文章（テキストエリア）が表示されます。文章は自由に書き換えることができます。</li>
                <li>シートには配信によって起きることの説明（LINEへの一斉配信、価格ページへのバナー表示、カレンダーへの反映）が表示されます。必ず確認してください。</li>
                <li>配信しない場合は「やめる」、配信する場合は「配信する」を押します。</li>
                <li>配信が終わると、対象の日はカレンダー上で「臨時休」と表示され、「配信しました（〇人）」というメッセージが表示されます。</li>
              </ol>

              <h4 className={styles.mini}>時短営業を設定して配信する場合</h4>
              <ol>
                <li>「時短にする」を選んだ状態で、カレンダー上の営業中の日付をタップして選びます（複数選択可）。</li>
                <li>画面下の「〇件選択中（時短） → 時間を設定して配信」バーをタップします。</li>
                <li>「時短営業を確定して配信」というシートが開きます。開始時刻・終了時刻を、6:00〜22:00の1時間刻みのセレクトボックスでそれぞれ選びます。</li>
                <li>自動で作られた案内文章（編集可能）を確認・修正し、「配信する」を押します。</li>
                <li>配信が終わると、対象の日は「9-15」のような時短の時間帯表示に変わり、「配信しました（〇人）」というメッセージが表示されます。</li>
              </ol>

              <h4 className={styles.mini}>休業・時短の設定を取り消す場合</h4>
              <p>休業中・臨時休業中・時短中・祝日休業になっているセルをタップすると、確認画面は出ずに、そのまま「営業」の状態に戻ります。</p>

              <div className={`${styles.callout} ${styles.warn}`}>
                <span className={styles.calloutHead}>⚠ 注意</span>
                <p>
                  「配信する」ボタンを押すと、その時点でLINE友だち全員に休業・時短のお知らせが配信されます。<strong>一度配信すると取り消すことはできません。</strong>
                  押す前に日付と文章の内容をよく確認してください。
                </p>
                <p>また、「営業に戻す」操作にはLINE配信は伴いません。カレンダー上の表示が元に戻るだけで、お客様への「取り消しました」という連絡は自動では送られません。もし配信後に内容を訂正したい場合は、あらためて「お知らせ」タブなどから補足の連絡をご検討ください。</p>
              </div>
            </div>

            <div id="tab-friends" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>4</span>友だち</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>LINEで友だち登録してくださったお客様の一覧を確認し、お一人おひとりについて、配信を受け取る対象にするかどうかを切り替えるタブです。</p>
              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「友だち」タブを開くと、上部に「配信対象〇人」「全〇人」という人数が表示されます。</li>
                <li>一覧には、はじめは配信対象の友だちだけが表示されます。それぞれの行には、お客様の表示名と、確認済みの本名（まだ確認できていない場合は「（本名確認中）」）が表示されます。</li>
                <li>配信対象になっていない友だちがいる場合は、一覧の下に「配信停止中（N件）を表示」というボタンが出てきます。押すと配信停止中の友だちも表示され、ボタンの表示は「配信停止中を隠す」に変わります。</li>
                <li>各行のボタンで、配信対象・対象外を切り替えられます。配信対象の方は「配信を止める」、配信停止中の方は「配信を再開」というボタンが表示されます。</li>
                <li>ボタンを押すとすぐに画面上の表示が切り替わります。裏側で保存の処理が行われ、万が一失敗した場合は表示が元に戻り、エラーメッセージが表示されます。</li>
              </ol>
              <div className={`${styles.callout} ${styles.info}`}>
                <span className={styles.calloutHead}>ひとこと</span>
                <p>このタブには、LINE友だち全員に一斉配信するボタンはありません。ここでの操作は「配信対象かどうか」の切り替えだけで、何度でもやり直しがききます。</p>
              </div>
            </div>

            <div id="tab-consultation" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>5</span>個別相談</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>
                お客様がLINEの「写真でかんたん査定」ボタンから送ってくださった写真や、それに続くメッセージを確認し、友だちごとに1つの会話として直接返信するタブです。
              </p>
              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「個別相談」タブを開くと、相談してきた友だちが新しい順に一覧表示されます。未対応のものには件数バッジが付きます。</li>
                <li>行をタップすると、その方とのやり取り（写真とメッセージが時系列に並んだ1つのスレッド）が開きます。写真はタップすると拡大表示されます。</li>
                <li>下部の入力欄に返信内容を入力し「送信する」を押すと、LINEにその場で返信が届きます（プッシュメッセージという方式のため、返信すると同時にその会話は対応済みになります）。</li>
                <li>返信の必要がないと判断した場合は「返信不要・対応済みにする」を押すと、返信せずに対応済みにできます。</li>
              </ol>
              <div className={`${styles.callout} ${styles.info}`}>
                <span className={styles.calloutHead}>ひとこと</span>
                <p>写真だけが送られてきてメッセージが伴っていない場合は「⚠ メッセージなし」の印が付きます。何を知りたいのかお客様に確認してから返信すると安心です。</p>
              </div>
            </div>

            <div id="tab-announce" className={styles.tabSection}>
              <h3 className={styles.tabName}><span className={styles.badge}>6</span>お知らせ</h3>
              <h4 className={styles.mini}>何をするタブか</h4>
              <p>価格情報や休業連絡以外の、自由な文章をLINE友だち全員に配信するためのタブです。キャンペーンのお知らせなど、幅広い内容に使えます。</p>
              <h4 className={styles.mini}>使い方</h4>
              <ol>
                <li>「お知らせ」タブを開くと、テキストエリアに配信したい文章を自由に入力します。</li>
                <li>文章が入力されていない間は「この内容でLINEに配信する」ボタンは押せません。入力すると押せるようになります。</li>
                <li>ボタンを押すと、まだ配信はされず「この内容で配信します」という確認シートが開きます。入力した文章がそのまま表示されるので、誤字脱字がないかこの時点でよく確認してください。</li>
                <li>内容が問題なければ「配信する」を押します。押すと「配信中…」に表示が変わります。取りやめる場合は「やめる」を押します。</li>
                <li>配信が完了すると、シートが閉じてテキストエリアが空になり、「配信しました（N人）」というメッセージが表示されます。</li>
              </ol>
              <div className={`${styles.callout} ${styles.warn}`}>
                <span className={styles.calloutHead}>⚠ 注意</span>
                <p>
                  確認シートの「配信する」を押すと、その時点でLINE友だち全員に文章がそのまま届きます。<strong>一度配信すると取り消すことはできません。</strong>
                  誤字や送信内容の間違いがないか、確認シートの画面で必ず見直してから押してください。
                </p>
              </div>
            </div>
          </section>

          <hr className={styles.hrDivider} />

          <section id="faq" className={styles.section}>
            <h2>4. よくあるトラブル / Q&amp;A</h2>
            <div className={styles.faq}>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. 価格配信タブで価格を入力して配信したのに、変わっていない気がします。</div>
                <p className={styles.faqA}>A. 「価格をプレビューして配信」で開くシートには、前回の配信から実際に価格が変わった品目だけが表示されます。まずは品目一覧の差分バッジ（「▲＋N」「▼N」「±0」など）で、入力した価格が正しく反映されているかご確認ください。また、価格を入力した後に欄の外をタップ（保存の確定）していないと反映されません。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. 品目管理で品目を間違えて削除してしまいました。元に戻せますか。</div>
                <p className={styles.faqA}>A. 削除は完全に取り消せません。もし削除してしまった場合は、「＋ 品目を追加」で同じ名前の品目を作り直し、「⋮⋮」で表示順を元の位置に戻してください（価格の入力履歴は引き継がれませんので、価格配信タブで入力し直してください）。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. iPhoneで価格の欄に小数点が打てません。</div>
                <p className={styles.faqA}>A. こちらはすでに修正済みです。現在は価格の入力欄で小数点キーが表示されるようになっており、「48.5」のように小数点第2位まで入力できます。もし数字が正しく反映されない場合は、一度入力欄をタップし直し、数字だけを入力し直してみてください。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. デスクトップにアイコンを作ったのに、押しても何も起きません。</div>
                <p className={styles.faqA}>A. まずChromeで一度そのURLを開き、右上の「⋮」メニューに「インストール」の項目があるかご確認ください。項目が見当たらない場合はChromeが最新版になっているかを確認し、一度ブラウザでURLを直接開いてからやり直してください。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. お客様がLINEを友だち追加してくれたのに、個別相談タブに出てきません。</div>
                <p className={styles.faqA}>A. 個別相談タブに一覧が出るのは、お客様が実際に「写真でかんたん査定」ボタンから写真やメッセージを送ってくださった場合のみです。友だち追加しただけの場合は表示されません。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. 友だちタブで「配信を止める」を押したら、その方にはもう二度と配信できなくなりますか。</div>
                <p className={styles.faqA}>A. いいえ、いつでもやり直せます。「配信停止中（N件）を表示」から見つけて「配信を再開」を押せば、また配信対象に戻せます。</p>
              </div>
              <div className={styles.faqItem}>
                <div className={styles.faqQ}>Q. 管理画面のURLを他のスタッフに教えてもよいですか。</div>
                <p className={styles.faqA}>A. 操作が必要なスタッフにだけ、個別に伝えるようにしてください。このURLにはログインやパスワードがなく、知っている人は誰でも価格変更やLINE配信ができてしまいます。グループの掲示板や誰でも見られる場所には書き込まないようにご注意ください。</p>
              </div>
            </div>
          </section>

          <section id="contact" className={styles.section}>
            <h2>5. こまったときの連絡先</h2>
            <p>操作方法がわからないときや、画面の動きがおかしいと感じたときは、このシステムを管理している担当者までご連絡ください。</p>
            <div className={styles.contactBox}>
              <div className={styles.contactRow}><span className={styles.k}>担当者名</span><span className={styles.fill}></span></div>
              <div className={styles.contactRow}><span className={styles.k}>電話番号</span><span className={styles.fill}></span></div>
              <div className={styles.contactRow}><span className={styles.k}>LINE</span><span className={styles.fill}></span></div>
              <div className={styles.contactCompany}>会社連絡先：有限会社金山商店　山口県岩国市新港町2丁目5-30　TEL 0827-22-7580</div>
            </div>
          </section>
        </main>
      </div>
      <footer className={styles.docFooter}>金山商店 買取価格LINE配信アプリ　管理画面 操作マニュアル</footer>
    </div>
  );
}
