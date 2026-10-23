# Auto test Web – Danh mục Thuốc thuỷ sản (Playwright)

Kịch bản Playwright cho **142 case** được đánh dấu `x` ở cột **"Có thể Auto"** trong file
`[Web]_Danh_mục_Thuốc_thuỷ_sản_VGREEN2_Review_TDK_Buoc.xlsx`. Cụ thể có 39 case GUI, 72 case FUNCT và 31 case VALIDATE.

Mỗi test có tiêu đề `[SHEET][ID] Tên test case`, ví dụ `[FUNCT][FUNCT-95] Kiểm tra Admin HT thêm mới đầy đủ thông tin`.
ID khớp với cột Testcase_ID trong Excel. Sau khi chạy, script sẽ ghi Pass/Fail ngược vào Excel.

> ⚠️ Chỉ chạy trên **STAGING**. Không commit file `.env` (đã có trong `.gitignore`).

## 1. Cài đặt

```bash
npm install
npx playwright install chromium
# File .env đã điền sẵn tài khoản HT / DN A / DN B (có trong zip, KHÔNG commit)
```

## 1b. Tạo dữ liệu mẫu (chạy 1 lần trước khi test)

```bash
npm run seed
```

Lệnh này đăng nhập bằng các tài khoản trong `.env` rồi tạo đúng các bản ghi trong Tiền điều kiện (danh sách ở `src/seedData.ts`):

| Tài khoản | Bản ghi tạo |
|---|---|
| Admin HT | HT_TS_01 Conflor 100 (đủ dữ liệu, Số QĐ TS1-0422, 3 đối tượng, 3 dòng lịch sử), HT_TS_02 Tilfo Super 300, HT_TS_03 Gramozin 20, HT_TS_04 Amitop 325 (2 hoạt chất chính + 1 phụ), HT_TS_05 Florcol 50, HT_TS_09 Gluxide 480 (Ngừng hoạt động) |
| Admin DN A | TS_RIFA_01 Rifamox 800 (đủ dữ liệu, 3 dòng lịch sử), TS_AZI_01 Azimix 5, TS_ACTI_01 Actimin 25, TS_GLU_01 Gluxide 480 DN (Ngừng hoạt động), TS_GLU_02 Gluxide 500; thêm từ hệ thống Conflor 100 và Florcol 50 |
| Admin DN B | TS_DNB_01 Thuốc DN B |
| Admin HT (cuối) | Đổi Đơn vị tính Florcol 50 → để DN A có popup Trùng dữ liệu |

- Bản ghi nào đã có (theo Mã) thì bỏ qua, nên chạy lại bao nhiêu lần cũng không bị trùng.
- Hoạt chất / đối tượng phòng trừ không có trong danh mục staging thì bỏ dòng đó và in cảnh báo `[seed]`. Bản ghi vẫn được tạo. Sửa tên cho khớp ở `src/seedData.ts` hoặc `SEED_DOI_TUONG` trong `.env`.
- Dữ liệu mẫu nằm chung backend nên **project Mobile dùng luôn dữ liệu này**, không cần seed riêng.
- `TTS_PATH` đang để trống: test tự vào qua menu và in ra đường dẫn thật (`[info] Đường dẫn màn Thuốc thuỷ sản: ...`), chép vào `.env` để chạy nhanh hơn.

## 2. Cấu hình `.env`

| Nhóm | Biến | Ghi chú |
|---|---|---|
| Môi trường | `BASE_URL`, `LOGIN_PATH`, `TTS_PATH` | `TTS_PATH` lấy bằng cách mở màn Danh mục Thuốc thuỷ sản rồi copy phần sau BASE_URL |
| Tài khoản | `HT_*`, `DNA_*`, `DNB_*` | Bắt buộc cho phần lớn case |
| Tài khoản phân quyền | `DNA_VIEW_*`, `DNA_NOQ_*`, `DNA_NOXUAT_*` | Bỏ trống thì FUNCT-3, 4, 5, 221 tự **SKIP** |
| Danh mục dùng khi nhập | `PHAN_LOAI`, `DVT`, `HINH_THUC`, `XUAT_XU`, `DN_VAT_TU`, `HOAT_CHAT`… | Mặc định theo Test data trong file TC |
| Dữ liệu mẫu | `HT_TS_01_NAME=Conflor 100`, `DNA_TS_NAME=Rifamox 800`… | Phải có sẵn trên staging, đúng như Tiền điều kiện |

## 3. Chạy

```bash
npm run seed                     # (1 lần) tạo dữ liệu mẫu
npm test                         # chạy tất cả (setup đăng nhập -> 142 case)
npm run test:gui                 # chỉ GUI
npm run test:funct               # chỉ FUNCT
npm run test:validate            # chỉ VALIDATE
npx playwright test -g "\[FUNCT-95\]"   # chạy 1 case
npm run test:headed              # mở trình duyệt để xem
npm run report                   # mở báo cáo HTML (reports/html)
```

## 4. Ghi kết quả vào Excel

```bash
npm run results:excel -- "duong/dan/[Web]_Danh_mục_Thuốc_thuỷ_sản_VGREEN2_Review_TDK_Buoc.xlsx"
# TESTER="Đỗ Văn Việt" npm run results:excel -- "..."   (ghi thêm cột Người test)
```

Script **không sửa file gốc**. Kết quả được lưu ra bản sao `..._KetQua_<yyyymmdd>.xlsx` ở 3 sheet `GUI sau Review`, `FUNCT sau Review` và `Validate`:
- **Lần 1/2/3 (cột J/K/L):** ghi `Pass`, `Fail` hoặc `Untested` vào ô trống đầu tiên.
- **Ngày test (cột P):** ngày chạy.
- **Ghi chú (cột Q):** nối thêm lý do Fail hoặc Skip.

Khi sửa file Excel (thêm, bớt hoặc đánh lại dấu Auto), đồng bộ lại rồi kiểm tra độ phủ:

```bash
npm run tc:sync -- "duong/dan/file_Review_TDK_Buoc.xlsx"
npm run tc:coverage
```

## 5. Chỉnh selector khi chạy lần đầu

Mọi selector dùng chung nằm trong **`src/ui.ts`**: `UI` (selector), `LABELS` (nhãn trường), `MSG` (câu thông báo) và `TITLES` (tiêu đề popup).
Nếu case lỗi kiểu "không tìm thấy phần tử", chạy `npx playwright codegen <BASE_URL>` để xem selector thật, rồi sửa **tại `src/ui.ts`**. Không cần sửa từng file test.

Vị trí cột trong bảng Hoạt chất và bảng Đối tượng phòng trừ được khai báo ở `HC_COL` và `DT_COL` (cuối file `src/pages/form.ts`). Nếu màn thật có thêm cột STT thì cộng thêm 1.

## 6. Nguyên tắc dữ liệu

- Mã và Tên do test tạo đều có hậu tố `RUN` (duy nhất mỗi lần chạy). Bản ghi tạo ra sẽ **tự xoá sau mỗi test**. Nếu không xoá được, log sẽ có dòng `[cleanup] ... xoá tay trên staging`.
- **Case chỉ đọc** dùng thẳng dữ liệu mẫu, ví dụ Conflor 100, Tilfo Super 300, Rifamox 800.
- **Case làm thay đổi dữ liệu** dùng bản ghi tự tạo thay cho bản ghi mẫu để không phá dữ liệu chung. Nhóm này gồm xoá, bật/tắt trạng thái, sửa Mã/Tên/Mô tả, đổi hoạt chất chính và Thêm từ hệ thống. Các case thuộc nhóm này: GUI-50, GUI-104; FUNCT-59, 60, 64, 70, 71, 72, 77, 78, 80, 88, 89, 91, 92, 124, 130, 131, 154, 189, 190, 202, 203, 227.
- Case kiểm tra lỗi trùng trên bản ghi mẫu (GUI-48, GUI-105, FUNCT-133, 134) chỉ mở popup rồi **Huỷ**, nên không lưu gì.
- File import được tạo lúc chạy: test tải file mẫu bằng "Xuất dữ liệu mẫu" rồi ghi dòng vào sheet `Du_lieu_tai_len`. Không cần chuẩn bị sẵn file `TTS_IMP_xxx.xlsx`.

## 7. Case cần thêm tiền điều kiện (thiếu thì SKIP)

| Case | Cần |
|---|---|
| FUNCT-3, FUNCT-4 | `DNA_NOQ_USER/PASS` |
| FUNCT-5 | `DNA_VIEW_USER/PASS` |
| FUNCT-221 | `DNA_NOXUAT_USER/PASS` |
| GUI-121 | `DNA_INHERITED_HT_CHANGED_NAME`: bản ghi DN A đã thêm từ HT, sau đó HT đổi Đơn vị tính |
| FUNCT-196 | `HOAT_CHAT_PATH` + `HT_ONLY_HOAT_CHAT`: hoạt chất HT có mà DN A chưa có. Hoạt chất sao chép sang DN A **không tự xoá được** |
| FUNCT-65, FUNCT-97 (phần Đơn vị tạo) | `DNA_NAME`, `NH1_NAME` (bỏ trống thì bỏ qua phần so sánh tên đơn vị) |
| GUI-51, FUNCT-82 | `HT_USED_CODE/NAME`: bản ghi HT đã được dùng ở màn nghiệp vụ (seed không tạo được vì cần module khác) |
| Phần dữ liệu Nông hộ (GUI-39, FUNCT-7, 9, 83, 158, 220, 222) | Chưa có tài khoản Nông hộ nên `NH1_TS_NAME` để trống: các case vẫn chạy nhưng bỏ qua phần kiểm tra bản ghi Nông hộ |

## 8. Cấu trúc thư mục

```
src/
  env.ts         biến môi trường, vai trò, dữ liệu mẫu
  ui.ts          selector, nhãn, thông báo (chỉnh ở đây)
  data.ts        sinh Mã/Tên duy nhất, bản ghi mẫu required()/full()
  fixtures.ts    as(role), seed(), track() + tự dọn dữ liệu
  helpers.ts     need(), expectFieldError(), expectInOrder()...
  flows.ts       addFromSystem(), editText()
  excel.ts       đọc file xuất, tạo file import từ file mẫu
  importer.ts    impRow(), prepareImport()
  pages/         list, form (+ bảng Hoạt chất / Đối tượng), detail, history, fromSystem, importPage
tests/
  auth.setup.ts  đăng nhập từng vai trò -> .auth/<ROLE>.json
  gui/ funct/ validate/
scripts/         excel-to-json, check-coverage, write-results
data/testcases.json   142 case Auto (sinh từ Excel)
```
