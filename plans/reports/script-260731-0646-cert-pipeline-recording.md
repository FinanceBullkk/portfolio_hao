# Script quay video — Cert pipeline

Mục tiêu: 2 video ngắn để thay CSS mock bằng bằng chứng thật trên `certificate-pipeline.html`.

## Chuẩn bị chung
- Quay màn hình, KHÔNG cần nói/thu âm — mình sẽ thêm caption/text overlay khi edit cho khớp tiếng Anh của site.
- Nếu có công cụ highlight con trỏ chuột thì bật (Windows: Xbox Game Bar `Win+G`, hoặc ScreenPal/OBS đều được).
- Làm chậm rãi hơn bình thường một chút — dễ cắt frame làm ảnh tĩnh nếu cần.
- Data thật của công ty (tên nhân viên, email, mã NV...) — nếu không muốn lộ, che/blur trước khi quay hoặc dùng data test. Bạn tự quyết, mình không ép.
- Lưu file vào `assets/raw/certificate-pipeline/` (folder mới, chưa tồn tại — tạo giúp mình, không commit lên git, chỉ để mình lấy clip/frame). Đặt tên theo gợi ý bên dưới.

## VIDEO A — Quy trình MỚI (đầy đủ, không cắt)
File gợi ý: `new-full-run.mp4`

1. **Mở Sheet** — check danh sách ai gần/cần làm cert + gửi cert.
2. **Chuẩn bị template** — mở template cert trong Canva.
3. **Input data + Bulk Create** — nhập data, chạy tính năng Bulk Create của Canva.
4. **Download PDF tổng** — tải file PDF gộp (nhiều trang = nhiều cert) từ Canva về.
5. **Cert renamer** — mở tool, chạy tách + rename PDF thành từng file riêng theo tên/mã.
6. **Đẩy lên Google Drive** — upload các file đã tách lên Drive.
7. **Apps Script trên Sheet**:
   a. Chạy để match tên với file cert vừa tách.
   b. **Test gửi cho chính mình trước** — điền email của bạn thay vì email nhân viên, gửi thử, mở email xem layout/nội dung cert ổn chưa.
   c. Đổi lại email thật của nhân viên, chạy gửi hàng loạt.
   d. Mở lại Sheet, cho thấy cột log/status đã ghi lại (gửi rồi / lỗi).

Nếu bước nào tên thực tế khác với trên (vd tên nút, tên menu Apps Script) thì cứ quay đúng thực tế — mình sẽ sửa chữ theo video, không cần đúng y kịch bản này.

## VIDEO B — Quy trình CŨ (minh họa ngắn, không cần làm đủ 300 cái)
File gợi ý: `old-manual-snippet.mp4`

Chỉ cần 3-4 bước minh họa, đủ thấy nó lặp lại/tốn thời gian, KHÔNG cần làm hết batch:

1. Mở file PDF tổng (chưa tách), tìm tên 1 người trong đó.
2. Tách/lưu riêng file đó ra, đổi tên tay theo tên người + mã cert.
3. Mở Gmail, soạn email, đính kèm file, gửi cho 1 người.
4. Lặp lại bước 2-3 cho người thứ 2 (quay nhanh, có thể tua nhanh/loop) — để thấy rõ tính lặp lại.

Nếu quy trình cũ thực tế của bạn khác (ví dụ dùng tool khác để tách PDF, hay không qua Gmail) thì quay theo đúng thực tế, không theo đúng kịch bản trên.

## Sau khi quay xong
Báo mình biết file đã nằm trong `assets/raw/certificate-pipeline/`, mình sẽ:
- Cắt frame làm ảnh tĩnh chỗ cần (thay các mock `.rename-example` / `.sheet-log` hiện tại bằng ảnh thật).
- Cân nhắc embed đoạn clip ngắn (native `<video>`, tự host, không qua YouTube) nếu đáng.
- Viết lại phần copy liên quan cho khớp với những gì video cho thấy.

## Câu hỏi còn mở
- 2 tool mini (calendar invite tool, exam results tool) trên cùng trang — có quay luôn đợt này không, hay để sau?
