# UI Copy and Safety — Implementation Reference

All user-facing text. Use stable translation keys, not hard-coded strings.

## Runtime Tokens
`{exercise_name}` `{localized_price}` `{billing_period}` `{duration_minutes}` `{movement_count}` `{movement_index}` `{movement_total}` `{set_index}` `{set_total}` `{reps_per_side}` `{completed_count}`

## Welcome

| Key | EN | TR |
|---|---|---|
| welcome.headline | Your next workout adapts to how you perform. | Bir sonraki antrenmanın performansına göre şekillenir. |
| welcome.subtitle | Short 5, 10, or 15-minute core workouts. No fixed calendar—just clear, gradual progress. | 5, 10 veya 15 dakikalık kısa core antrenmanları. Sabit takvim yok; anlaşılır ve adım adım ilerleme var. |
| welcome.cta | Get started | Başla |
| analytics.description | Anonymous usage data helps us improve the app. Personal or health information is not shared. | Anonim kullanım verileri uygulamayı geliştirmemize yardımcı olur. Kişisel veya sağlık bilgileri paylaşılmaz. |
| analytics.share | Share and continue | Paylaş ve devam et |
| analytics.decline | Continue without sharing | Paylaşmadan devam et |

## Safety Screen

| Key | EN | TR |
|---|---|---|
| safety.title | Train safely | Güvenli antrenman yap |
| safety.scope | Adaptive Core provides general fitness guidance for adults aged 18 and over. It is not a medical device and does not diagnose, treat, or provide rehabilitation for any condition. | Adaptive Core, 18 yaş ve üzerindeki yetişkinler için genel fitness yönlendirmesi sunar. Tıbbi cihaz değildir; herhangi bir rahatsızlığa tanı koymaz, tedavi veya rehabilitasyon sağlamaz. |
| safety.consult | If you are pregnant, injured, have a health condition, or have been advised to limit exercise, speak with a qualified healthcare professional before starting. | Hamileysen, yaralanman veya bir sağlık sorunun varsa ya da egzersizi sınırlandırman önerildiyse başlamadan önce yetkin bir sağlık uzmanına danış. |
| safety.stop | Stop exercising if you feel pain, dizziness, chest discomfort, or unusual shortness of breath. Seek urgent medical help if symptoms are severe or do not go away. | Ağrı, baş dönmesi, göğüste rahatsızlık veya olağan dışı nefes darlığı hissedersen egzersizi bırak. Belirtiler şiddetliyse veya geçmiyorsa acil tıbbi yardım al. |
| safety.confirm | I am 18 or older and I understand. | 18 yaşında veya daha büyüğüm ve anladım. |
| safety.cta | Continue | Devam et |

## Onboarding

| Key | EN | TR |
|---|---|---|
| onboarding.exp.title | How familiar are you with core training? | Core antrenmanlarına ne kadar aşinasın? |
| onboarding.exp.beginner | I'm just getting started | Yeni başlıyorum |
| onboarding.exp.some | I have some experience | Biraz deneyimim var |
| onboarding.exp.regular | I train regularly | Düzenli antrenman yapıyorum |
| onboarding.exp.helper | This helps us choose a safe starting point. | Bu bilgi güvenli bir başlangıç seviyesi seçmemize yardımcı olur. |
| onboarding.dur.title | How long would you like most workouts to be? | Antrenmanlarının genellikle ne kadar sürmesini istersin? |
| onboarding.dur.5 | 5 minutes | 5 dakika |
| onboarding.dur.10 | 10 minutes | 10 dakika |
| onboarding.dur.15 | 15 minutes | 15 dakika |
| onboarding.dur.helper | You can change this before any workout. | Bu süreyi her antrenmandan önce değiştirebilirsin. |
| onboarding.limit.title | Is there anything we should avoid today? | Bugün kaçınmamız gereken bir durum var mı? |
| onboarding.limit.no | No | Hayır |
| onboarding.limit.pain | I have pain or discomfort | Ağrı veya rahatsızlığım var |
| onboarding.limit.ongoing | I have an ongoing movement limitation | Devam eden bir hareket kısıtlamam var |
| onboarding.limit.helper | We use this only to avoid unsuitable movements—not to diagnose a condition. | Bu bilgiyi yalnızca uygun olmayan hareketlerden kaçınmak için kullanırız; tanı koymayız. |
| onboarding.area.lower_back | Lower back | Bel |
| onboarding.area.neck | Neck | Boyun |
| onboarding.area.shoulders | Shoulders | Omuzlar |
| onboarding.area.hips | Hips | Kalça |
| onboarding.area.knees | Knees | Dizler |
| onboarding.area.other | Other area | Başka bir bölge |

## Baseline

| Key | EN | TR |
|---|---|---|
| baseline.title | Let's find your starting point | Başlangıç seviyeni birlikte bulalım |
| baseline.description | You'll try up to three short movements. This takes about 2–3 minutes and is not a maximum-effort test. | En fazla üç kısa hareket deneyeceksin. Bu değerlendirme yaklaşık 2–3 dakika sürer ve maksimum performans testi değildir. |
| baseline.safety | Move slowly and stay within a comfortable range. Stop immediately if you feel pain. | Yavaş hareket et ve rahat hissettiğin aralıkta kal. Ağrı hissedersen hemen dur. |
| baseline.cta | Start baseline | Değerlendirmeyi başlat |
| baseline.progress | Movement {movement_index} of {movement_total} | Hareket {movement_index} / {movement_total} |
| baseline.start | Start | Başlat |
| baseline.cant | I can't do this movement | Bu hareketi yapamıyorum |
| baseline.pain_stop | Stop — I feel pain | Dur — Ağrı hissediyorum |
| baseline.feel | How did that feel? | Nasıl hissettirdi? |

## Feedback Labels (shared baseline + workout)

| Key | EN | TR |
|---|---|---|
| feedback.easy | Easy | Kolay |
| feedback.right | About right | Uygundu |
| feedback.hard | Hard | Zor |
| feedback.incomplete | I couldn't finish | Tamamlayamadım |
| feedback.pain | I felt pain | Ağrı hissettim |

## Today Screen

| Key | EN | TR |
|---|---|---|
| today.first_title | Your first workout is ready | İlk antrenmanın hazır |
| today.returning_title | Today's core workout | Bugünkü core antrenmanın |
| today.meta | {duration_minutes} minutes · {movement_count} movements · No equipment | {duration_minutes} dakika · {movement_count} hareket · Ekipman gerekmez |
| today.why_title | Why this workout? | Neden bu antrenman? |
| today.why_first | Built from your preferred duration, experience, movement limitations, and baseline results. | Tercih ettiğin süre, deneyimin, hareket kısıtlamaların ve başlangıç değerlendirmene göre hazırlandı. |
| today.preview | Preview workout | Antrenmanı incele |
| today.workout_title | Today's workout | Bugünkü antrenman |
| today.start | Start workout | Antrenmanı başlat |
| today.change_dur | Change duration | Süreyi değiştir |

## Workout Player

| Key | EN | TR |
|---|---|---|
| player.movement | Movement {movement_index} of {movement_total} | Hareket {movement_index} / {movement_total} |
| player.set | Set {set_index} of {set_total} | Set {set_index} / {set_total} |
| player.per_side | {reps_per_side} reps per side | Her taraf için {reps_per_side} tekrar |
| player.start_set | Start set | Seti başlat |
| player.pause | Pause | Duraklat |
| player.replace | Replace | Değiştir |
| player.end | End workout | Antrenmanı bitir |
| player.cues | View all cues | Tüm ipuçlarını gör |
| player.next | Up next | Sırada |

## Post-Workout

| Key | EN | TR |
|---|---|---|
| complete.title | Workout complete | Antrenman tamamlandı |
| complete.question | How did this workout feel overall? | Bu antrenman genel olarak nasıl hissettirdi? |
| complete.see_changes | See what changed | Neyin değiştiğini gör |

## Adaptation Messages

| Outcome | EN | TR |
|---|---|---|
| 2nd easy | You handled this level well twice. We'll increase one part of your next similar workout by a small step. | Bu seviyeyi iki kez rahat tamamladın. Bir sonraki benzer antrenmanında yalnızca bir bölümü küçük bir adımla artıracağız. |
| appropriate | This level felt appropriate, so your next similar workout will stay here. | Bu seviye sana uygun geldi. Bir sonraki benzer antrenmanın bu seviyede kalacak. |
| hard | This workout felt hard. We'll keep the load stable and give you 15 seconds more rest next time. | Bu antrenman zor geldi. Yükü sabit tutacak ve bir sonraki sefer 15 saniye daha fazla dinlenme vereceğiz. |
| incomplete | You couldn't complete this workout, so the next one will be lighter. | Bu antrenmanı tamamlayamadın. Bu nedenle bir sonraki antrenmanın daha hafif olacak. |
| pain | We've excluded the movement that caused discomfort. It won't appear in upcoming workouts for now. | Rahatsızlığa neden olan hareketi dışladık. Bu hareket şimdilik sonraki antrenmanlarında yer almayacak. |

## Account & Save

| Key | EN | TR |
|---|---|---|
| save.prompt | Save your progress and get your next adapted workout. | İlerlemeni kaydet ve bir sonraki uyarlanmış antrenmanını al. |
| save.title | Save your progress | İlerlemeni kaydet |
| save.description | Create an account to keep your baseline, workout results, movement exclusions, and future adaptations together. | Başlangıç değerlendirmeni, antrenman sonuçlarını, dışlanan hareketleri ve sonraki adaptasyonlarını birlikte saklamak için hesap oluştur. |
| save.warning | Without an account, your progress stays only on this device and may be lost if the app is removed. | Hesap oluşturmazsan ilerlemen yalnızca bu cihazda tutulur ve uygulama kaldırılırsa kaybolabilir. |
| save.cta | Create account | Hesap oluştur |
| save.skip | Not now | Şimdi değil |

## Monetization

| Key | EN | TR |
|---|---|---|
| beta.title | Would you continue with Adaptive Core? | Adaptive Core ile devam eder miydin? |
| beta.description | Your first two adaptive workouts are included. Ongoing adaptive training is planned at **{localized_price} / {billing_period}**. | İlk iki adaptif antrenmanın ücretsiz. Devam eden adaptif antrenmanlar için planlanan fiyat **{localized_price} / {billing_period}**. |
| beta.notice | The closed beta is free. You won't be charged today. | Kapalı beta ücretsizdir. Bugün herhangi bir ücret alınmaz. |
| beta.choose | I'd choose this plan | Bu planı seçerdim |
| beta.notify | Notify me when it's available | Kullanıma açıldığında haber ver |
| beta.skip | Not now | Şimdi değil |
| paid.title | Keep your workouts adapting | Antrenmanların sana uyarlanmaya devam etsin |
| paid.description | Continue with workouts built from your performance, recovery, and recent history. | Performansına, toparlanma durumuna ve yakın geçmişine göre hazırlanan antrenmanlarla devam et. |
| paid.terms | {localized_price} / {billing_period}. Auto-renews unless cancelled. Manage or cancel anytime through your store account. | {localized_price} / {billing_period}. İptal edilmediği sürece otomatik yenilenir. Aboneliğini mağaza hesabından istediğin zaman yönetebilir veya iptal edebilirsin. |
| paid.cta | Continue with membership | Üyelikle devam et |
| paid.restore | Restore purchase | Satın alımı geri yükle |
| paid.skip | Not now | Şimdi değil |
| paid.bullet1 | Ongoing adaptive workouts | Devam eden adaptif antrenmanlar |
| paid.bullet2 | Clear explanations for meaningful changes | Önemli değişiklikler için anlaşılır açıklamalar |
| paid.bullet3 | Long-term progress and workout history | Uzun dönem ilerleme ve antrenman geçmişi |

## Progress & Settings

| Key | EN | TR |
|---|---|---|
| progress.title | Your progress | İlerlemen |
| progress.week | This week | Bu hafta |
| progress.count | {completed_count} workouts completed | {completed_count} antrenman tamamlandı |
| progress.capacity | Capacity progress | Kapasite gelişimi |
| progress.recent | Recent adaptations | Son adaptasyonlar |
| progress.history | Workout history | Antrenman geçmişi |
| progress.empty | Your progress starts with your first workout. | İlerlemen ilk antrenmanınla başlayacak. |
| progress.go_today | Go to Today | Bugün ekranına git |
| settings.account | Account | Hesap |
| settings.language | Language | Dil |
| settings.sound | Sound & cues | Ses ve yönlendirmeler |
| settings.reminders | Reminders | Hatırlatmalar |
| settings.limitations | Movement limitations | Hareket kısıtlamaları |
| settings.subscription | Subscription | Abonelik |
| settings.privacy | Privacy | Gizlilik |
| settings.analytics_toggle | Share anonymous usage data | Anonim kullanım verilerini paylaş |
| settings.analytics_helper | You can change this anytime. | Bu tercihi istediğin zaman değiştirebilirsin. |
| settings.delete | Delete account | Hesabı sil |
| settings.safety | Safety information | Güvenlik bilgileri |
| nav.today | Today | Bugün |
| nav.progress | Progress | İlerleme |
| nav.settings | Settings | Ayarlar |

## Pain & Protective States

| Key | EN | TR |
|---|---|---|
| pain.title | Stop this movement | Bu hareketi durdur |
| pain.message | Don't continue through pain. We've removed **{exercise_name}** from this workout and will avoid it in future workouts for now. | Ağrının üzerine gitme. **{exercise_name}** bu antrenmandan çıkarıldı ve şimdilik sonraki antrenmanlarda kullanılmayacak. |
| pain.consult | If the pain is severe, continues after stopping, or worries you, speak with a qualified healthcare professional. | Ağrı şiddetliyse, durduktan sonra devam ediyorsa veya seni endişelendiriyorsa yetkin bir sağlık uzmanına danış. |
| pain.emergency | For chest pain, fainting, or severe or unusual shortness of breath, stop exercising and contact local emergency services. | Göğüs ağrısı, bayılma veya şiddetli ya da olağan dışı nefes darlığında egzersizi bırak ve bulunduğun yerdeki acil yardım hizmetlerine ulaş. |
| pain.end | End workout | Antrenmanı bitir |
| pain.alternative | Continue with a safe alternative | Güvenli alternatifle devam et |
| no_sub.title | We've shortened this workout | Bu antrenmanı kısalttık |
| no_sub.message | There isn't a suitable replacement that meets your current safety settings. Skipping this movement is the safer choice. | Mevcut güvenlik ayarlarına uygun bir alternatif bulunamadı. Bu hareketi atlamak daha güvenli bir seçim. |
| no_sub.cta | Continue workout | Antrenmana devam et |
| no_workout.title | Rest is the right choice today | Bugün dinlenmek doğru seçim |
| no_workout.message | We couldn't build a workout that meets your current safety settings. You haven't lost progress. | Mevcut güvenlik ayarlarına uygun bir antrenman oluşturamadık. İlerlemeni kaybetmedin. |
| no_workout.back | Back to Today | Bugün ekranına dön |
| no_workout.review | Review my limitations | Kısıtlamalarımı gözden geçir |
| media.unavailable | Demo unavailable. You can continue with the written cues or choose another movement. | Gösterim yüklenemedi. Yazılı ipuçlarıyla devam edebilir veya başka bir hareket seçebilirsin. |
| resume.title | You have a workout in progress | Devam eden bir antrenmanın var |
| resume.message | Continue from where you stopped. Your completed sets are saved. | Kaldığın yerden devam edebilirsin. Tamamladığın setler kaydedildi. |
| resume.cta | Resume workout | Antrenmana devam et |
| resume.end | End this workout | Bu antrenmanı bitir |
| offline.cached | You're offline. Your workout is saved on this device and will sync when you reconnect. | Çevrimdışısın. Antrenmanın bu cihazda kaydedildi ve bağlantı kurduğunda eşitlenecek. |
| offline.no_cache | A connection is needed to prepare your next workout. | Bir sonraki antrenmanını hazırlamak için internet bağlantısı gerekiyor. |
| offline.retry | Try again | Tekrar dene |
| error.title | Something went wrong | Bir sorun oluştu |
| error.message | Your completed workout data is safe. Try again to continue. | Tamamladığın antrenman verileri güvende. Devam etmek için tekrar dene. |
| error.retry | Try again | Tekrar dene |
| error.back | Back to Today | Bugün ekranına dön |
