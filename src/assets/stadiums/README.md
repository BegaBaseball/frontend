# Stadium Seat Map Assets

`lg/` contains the LG Twins official public ticket seat map assets from `https://www.lgtwins.com/ticket/general`.

`doosan/` contains the Doosan Bears official public Jamsil stadium guide images from `https://www.doosanbears.com/bears/stadium?tabId=seoul`.

`ssg/` contains the SSG Landers official public ticket seat map asset from `https://www.ssglanders.com/game/ticket`.
Keep `incheon-ssg-seatmap-official-2026.png` as the source image and use the generated WebP beside it for runtime rendering.

`kiwoom/` contains the operator-provided official Gocheok Sky Dome ticket seat map asset. The expected file is `gocheok-kiwoom-seatmap-official-2026.png`.

`kia/` contains the operator-provided official Gwangju-KIA Champions Field ticket seat map asset. The expected file is `gwangju-kia-seatmap-official-2026.png`; the 2026-05-11 operator block-range review maps K7 and away cheering to existing numbered block polygons, while any future aggregate K7/AWAY polygon still requires operator-provided official PNG coordinates before exposure.

`nc/` contains the NC Dinos official Changwon NC Park stadium guide seat map asset from `https://www.ncdinos.com/dinos/stadium.do`.

`hanwha/` is reserved for the operator-provided official Daejeon Hanwha Life Eagles Park ticket seat map asset.

`samsung/` is reserved for the operator-provided official Daegu Samsung Lions Park ticket seat map asset. The expected file is `daegu-samsung-seatmap-official-2026.png`.

`kt/` contains the Suwon kt wiz Park official 2026 seat map asset from `https://www.ktwiz.co.kr/ticket/seatmap`. The runtime source is `suwon-kt-seatmap-official-2026@2x.jpg`, copied from the official `SEAT_MAP_PC` resource (`2026/03/26`, 4290 x 9679). Keep the older `suwon-kt-seatmap-official-2026.png` only as the previous draft reference. Suwon hit areas are static official-image coordinates and the exposed block range follows the visible 2026 official image (`101-133`, `201-233`, `301-328`, `401-432`, and `SB1-SB35`). Do not hotlink the kt resource or add a runtime crawler; refresh this static asset only from operator-approved official kt wiz material. `https://myseatcheck.com/%EC%88%98%EC%9B%90-kt%EC%9C%84%EC%A6%88%ED%8C%8C%ED%81%AC-2/` may be used only as a manual QA reference for seat-click UX coverage, not as a runtime data source or crawler target.

`lotte/` contains the approved Lotte Giants official Sajik Baseball Stadium ticket seat map asset from `https://www.giantsclub.com/html/?pcode=340`. The runtime file is `sajik-lotte-seatmap-official-2026.png`, converted from the official 960 x 640 source image and paired with static manually traced block hit areas.

Do not add runtime crawling, hotlinking, or copied third-party seat map images here. If an official source file is not available, keep the related UI in `MANUAL_BASEBALL_DATA_REQUIRED` state.
