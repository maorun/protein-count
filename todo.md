# Protein Counter — Future Extension Ideas

A living document of planned and potential features for the Protein Counter PWA.

---

## 📊 Data & History

- [ ] **Charts & history view** — Weekly/monthly bar charts of protein intake (using Chart.js or Canvas API)
- [ ] **Calendar heatmap** — GitHub-style heatmap showing consistency over time
- [ ] **Streaks** — Track consecutive days hitting the daily goal
- [ ] **Personal records** — Highlight best days, longest streaks
- [ ] **Export data** — Download as CSV or JSON for external analysis
- [ ] **Import data** — Restore from exported backup file

---

## 🍎 Food Database

- [ ] **Barcode scanner** — Scan packaged food barcodes via camera (Open Food Facts API)
- [ ] **Search food database** — Integrate USDA FoodData Central or similar API
- [ ] **Serving size calculator** — Adjust portions with a slider (e.g., 150g → 250g auto-scales protein)
- [ ] **Nutritional info** — Optionally track calories, carbs, fat alongside protein
- [ ] **Recipe builder** — Combine foods into a meal/recipe and save as a single item
- [ ] **Food categories** — Group foods (Dairy, Meat, Supplements, etc.)

---

## 🍽 Meal Planning

- [ ] **Meal templates** — Save typical meals (e.g., "Post-workout") as one-tap entries
- [ ] **Daily meal schedule** — Plan breakfast/lunch/dinner/snacks in advance
- [ ] **Weekly planner** — Lay out the whole week and auto-calculate totals
- [ ] **Suggested meals** — Smart suggestions to reach remaining daily goal

---

## 🔔 Notifications & Reminders

- [ ] **Push notifications** — Reminders to log protein at custom times
- [ ] **Goal alerts** — Notify when 50%, 75%, and 100% of goal is reached
- [ ] **End-of-day reminder** — Alert if goal not yet hit by a configured time
- [ ] **Weekly summary** — Notification with average intake for the past week

---

## 🎯 Goals & Profiles

- [ ] **Multiple goals** — Separate goals for training days vs. rest days
- [ ] **Body-weight–based goal** — Auto-calculate goal from weight (e.g., 2g/kg body weight)
- [ ] **Multiple profiles** — Support family members or athletes sharing a device
- [ ] **Goal history** — Track how the daily goal has changed over time

---

## 🔄 Sync & Cloud

- [ ] **Cloud sync** — Optional account to sync across devices (Firebase / Supabase)
- [ ] **Google Fit / Apple Health integration** — Write protein data to health platforms
- [ ] **Offline-first sync** — Conflict-free merging when coming back online

---

## 🎨 UI / UX

- [ ] **Dark / light / system theme** — Theme switcher
- [ ] **Haptic feedback** — Vibration on successful log (mobile)
- [ ] **Animations** — Confetti on hitting daily goal
- [ ] **Widget** — Home-screen widget for quick glance (requires platform API)
- [ ] **Keyboard shortcuts** — Power-user shortcuts for desktop
- [ ] **Drag-to-reorder** — Reorder favorite foods via drag and drop

---

## ♿ Accessibility

- [ ] **Screen-reader improvements** — Better ARIA labels and live region updates
- [ ] **High-contrast mode** — Extra-high contrast theme for low vision users
- [ ] **Font-size setting** — User-adjustable text size
- [ ] **Voice input** — "Hey Siri, log 30 grams" via Web Speech API

---

## 🛠 Technical

- [ ] **TypeScript migration** — Add type safety as the codebase grows
- [ ] **Unit tests** — Jest tests for storage, calculations, data migration
- [ ] **E2E tests** — Playwright tests for core user flows
- [ ] **Data migrations** — Versioned localStorage schema migrations
- [ ] **Compression** — LZ-string compress stored history to save localStorage space
- [ ] **Share sheet** — Share today's intake summary as an image or text
- [ ] **Install prompt** — Better custom "Add to Home Screen" prompt UI
