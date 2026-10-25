# Day 1: Cosmic Distances

_About 30 minutes_

---

Understanding how astronomers measure the vast gulfs of space is the foundation of all astrophysics. Without knowing how far away a star or galaxy is, we cannot know its true brightness, size, or mass.

### Why We Need New Units

On Earth, we use kilometers. Within our solar system, we use Astronomical Units (AU)—the average distance from the Earth to the Sun, about 150 million kilometers. But once we look outside our solar system, kilometers and AU become uselessly small. To bridge this gap, astronomers use two main units: the **light-year** and the **parsec**.

A **light-year (ly)** is the distance light travels in one Earth year. Because light travels at roughly 300,000 kilometers per second, one light-year is about 9.46 trillion kilometers. 

A **parsec (pc)** is even larger and is the preferred unit among professional researchers. One parsec is equal to approximately 3.26 light-years. Formally, a parsec is defined as the distance at which a star has a parallactic angle of one arcsecond when viewed from opposite sides of Earth's orbit.

**Worked Example 1: Converting Light-Years to Parsecs**
Suppose you read that the Andromeda Galaxy is roughly 2.5 million light-years away from Earth. How far is that in parsecs?

To convert light-years to parsecs, divide the distance in light-years by 3.26:

`Distance (pc) = 2,500,000 ly / 3.26 ≈ 766,871 pc`

So, Andromeda is about 767,000 parsecs away.

### The Inverse-Square Law for Brightness

How do we actually measure these distances? One fundamental tool is the **inverse-square law**. Light spreads out spherically as it travels from a source. The surface area of a sphere grows with the square of its radius ($4\pi r^2$). Consequently, the apparent brightness of a light source drops off inversely with the square of the distance.

The formula is:

`Brightness ∝ 1 / d²`

If you double the distance to a star ($d$ becomes $2d$), the brightness drops by a factor of $2^2 = 4$. It looks four times dimmer, not two times dimmer.

**Worked Example 2: Applying the Inverse-Square Law**
Imagine a star is observed at a distance of 10 parsecs, and its apparent brightness is measured at 100 units. If that same exact star were moved outward to a distance of 30 parsecs, what would its new apparent brightness be?

1. Find the factor by which the distance increased: `30 pc / 10 pc = 3`. The distance tripled.
2. Square that factor: `3² = 9`.
3. Divide the original brightness by that squared factor: `100 units / 9 ≈ 11.1 units`.

The star's new apparent brightness is approximately 11.1 units.

### Common Mistakes to Avoid

* **Confusing light-years with time:** A light-year is a unit of *distance*, not time. When we say a star is 10 light-years away, we mean the light we see tonight left that star 10 years ago.
* **Linear thinking with brightness:** Assuming that doubling the distance cuts the brightness in half. Remember it is an *inverse-square* relationship; double the distance means one-quarter the brightness.

### Recap

* **Units:** Light-years measure distance by how far light travels in a year; parsecs equal 3.26 light-years and are standard in professional astronomy.
* **Conversion:** To go from light-years to parsecs, divide by 3.26.
* **Inverse-Square Law:** Apparent brightness decreases proportionally to the square of the distance ($1/d^2$).

---

## Practice task

You are analyzing two observational targets. Target A is a star located at a distance of 5 parsecs. Target B is an identical type of star located at a distance of 20 parsecs.

1. Convert the distance of Target A from parsecs to light-years.
2. Using the inverse-square law, calculate how much dimmer Target B appears compared to Target A. Show your step-by-step reasoning.
3. Explain in 1-2 sentences why astronomers prefer parsecs over light-years for many technical calculations.

| Criterion | What good looks like | Points |
| --- | --- | --- |
| Parsec to light-year conversion | Correctly multiplies 5 parsecs by 3.26 to arrive at 16.3 light-years with clear units shown. | 3 |
| Inverse-square calculation | Correctly identifies the distance ratio (4x), squares it (16x), and concludes that Target B is 16 times dimmer than Target A. | 4 |
| Conceptual explanation | Accurately explains that parsecs relate directly to trigonometric parallax measurements made from Earth's orbit, making them more practical for stellar geometry. | 3 |

---

## Quiz

**1. If a star is located 65.2 light-years away from Earth, what is its approximate distance in parsecs?** _(topic: `distance-scales`)_

- A. 212.6 parsecs
- B. 20.0 parsecs
- C. 61.9 parsecs
- D. 130.4 parsecs

> Answer: **B**. To convert light-years to parsecs, you divide by 3.26. 65.2 / 3.26 = 20.0 parsecs. Multiplying by 3.26 is a common mistake made by beginners.

**2. A spacecraft travels away from a radio beacon. If it moves from a distance of 2 AU to a fraction of 6 AU, by what factor does the signal's brightness decrease?** _(topic: `inverse-square`)_

- A. It decreases by a factor of 3
- B. It decreases by a factor of 6
- C. It decreases by a factor of 9
- D. It decreases by a factor of 36

> Answer: **C**. The distance increases by a factor of 3 (6 AU / 2 AU = 3). According to the inverse-square law, you square this factor (3^2 = 9), meaning the signal is 9 times dimmer. Squaring the absolute distance rather than the ratio or simply multiplying by the ratio are common errors.

**3. Which of the following statements best defines a light-year?** _(topic: `distance-scales`)_

- A. The time it takes for Earth to revolve around the Sun one time
- B. The distance light travels through a vacuum in one Earth year
- C. The average distance from the Earth to the nearest star outside our solar system
- D. The maximum distance light can travel across the observable universe in a lifetime

> Answer: **B**. A light-year is strictly a unit of length (distance), defined as the distance light covers in one Earth year. Confusing it with a unit of time is a classic misconception.

**4. Star X and Star Y are identical in every physical way (luminosity), but Star Y is 5 times further away than Star X. How do their apparent brightnesses compare?** _(topic: `inverse-square`)_

- A. Star Y is 5 times dimmer than Star X
- B. Star Y is 10 times dimmer than Star X
- C. Star Y is 25 times dimmer than Star X
- D. Star Y is 125 times dimmer than Star X

> Answer: **C**. Because of the inverse-square law, increasing distance by a factor of 5 reduces apparent brightness by 5 squared, which is 25. Choosing 5 assumes a linear relationship instead of squared.

**5. Why is the parsec historically and geometrically tied to the Astronomical Unit (AU)?** _(topic: `distance-scales`)_

- A. Because 1 parsec is defined by an object having a parallax of 1 arcsecond using a baseline of 1 AU
- B. Because 1 parsec equals exactly 63,150 AU by definition
- C. Because ancient astronomers used AU to measure parsecs directly with radar
- D. Because parsecs are only used for objects inside our solar system where the AU applies

> Answer: **A**. A parsec is derived from 'parallax of one arcsecond,' representing the distance at subtending a 1-arcsecond shift against background stars using a 1 AU radius baseline. Distances outside our solar system frequently use parsecs precisely because of this trigonometric geometry.

