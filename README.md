### Run

Install dependencies

```bash
pnpm install
```

Local development

```bash
npx nodemon -w . -x "pnpm tsc && node --trace-deprecation dist/app.js" -e "ts json"
```

### APIs

Path: `/universities/rmit/academic-contacts`
Response sample:

```json
[
  {
    "url": "https://www.rmit.edu.au/contact/staff-contacts/academic-staff/a/abanteriba-professor-sylvester",
    "lastModified": "2018-08-25",
    "name": "Professor Sylvester Abanteriba",
    "position": "+61399251193",
    "college": "STEM College",
    "school": "STEM|School of Engineering",
    "phone": null,
    "email": "sylvester.abanteriba@rmit.edu.au",
    "campus": "City Campus",
    "contactAbout": "Research supervision",
    "orcid": "https://orcid.org/0000-0003-0110-3135"
  },
  {
    "url": "https://www.rmit.edu.au/contact/staff-contacts/academic-staff/a/acker-dr-aleksandra",
    "lastModified": "2022-02-03",
    "name": "Dr Aleksandra Acker",
    "position": "+61399257830",
    "college": "Design and Social Context",
    "school": "DSC|School of Education",
    "phone": null,
    "email": "aleksandra.acker@rmit.edu.au",
    "campus": "Bundoora West",
    "contactAbout": "Research supervision",
    "orcid": "https://orcid.org/0000-0003-4284-6891"
  }
]
```
