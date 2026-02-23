-refactor job_contract logic -> bikin parse dari cards aja (cari dari semua elemen) (done)
-create an accurate scraping keywords/job_type/job_contract (refactor code nya, flow nya terlihat muter2 dan memusingkan), logic nya job_contract & job_type masih aneh

detail :
get data dari cards lalu description,
cek apakah keywords/job_type/job_contract sesuai, jika tidak sesuai skip
save_to_db function bikin langsung store ke db aja, gausah bikin logic lagi

-create more filters at ui
