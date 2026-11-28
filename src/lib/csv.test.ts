import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses headers, quotes, commas and CRLF", () => {
    const text = '﻿Enrollment No,Name,Email\r\n0801AL231001,"Sharma, Riya",riya@college.edu\r\n0801AL231002,"Kumar ""KK"" K",kk@college.edu\r\n';
    expect(parseCsv(text)).toEqual([
      { enrollment_no: "0801AL231001", name: "Sharma, Riya", email: "riya@college.edu" },
      { enrollment_no: "0801AL231002", name: 'Kumar "KK" K', email: "kk@college.edu" },
    ]);
  });

  it("skips blank lines and fills missing cells", () => {
    expect(parseCsv("name,phone\n\nAsha\n")).toEqual([{ name: "Asha", phone: "" }]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
