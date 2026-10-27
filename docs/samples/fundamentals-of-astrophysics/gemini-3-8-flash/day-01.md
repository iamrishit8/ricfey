# Day 1: Keplerian Orbits and Planetary Motion

_About 25 minutes_

---

# Keplerian Orbits and Planetary Motion

Every space mission, exoplanet confirmation, and satellite pass relies on one foundational truth: the physics governing how masses orbit in space. Mastering Keplerian motion gives you the exact tools needed to calculate how fast an object moves and how long its journey takes based solely on the geometry of its path.

---

### 1. The Geometry of an Ellipse

Kepler's First Law states that planetary orbits are ellipses with the primary mass (such as the Sun) at one focus. 

An ellipse is defined by two key parameters:
- **Semi-major axis ($a$):** Half of the longest diameter of the ellipse. This represents the average distance from the orbiting body to the central mass.
- **Eccentricity ($e$):** A dimensionless measure of how stretched the ellipse is ($0 \le e < 1$ for bound orbits; $e = 0$ is a perfect circle).

From these two numbers, you can directly find the closest and farthest points of the orbit:
- **Periastron ($r_p$):** Point of closest approach:  
  $$r_p = a(1 - e)$$
- **Apastron ($r_a$):** Point of greatest distance:  
  $$r_a = a(1 + e)$$

*(Note: When orbiting the Sun, these are called perihelion and aphelion; around Earth, perigee and apogee.)*

---

### 2. Kepler's Third Law (The Harmonic Law)

Kepler observed that the square of an orbital period ($P$) is proportional to the cube of the semi-major axis ($a$):

$$P^2 \propto a^3$$

When working within our Solar System (or any system where the central mass is $1\text{ M}_\odot$, and the orbiting body's mass is negligible), you can choose convenient units to eliminate constants: measure $P$ in **Earth years** and $a$ in **Astronomical Units (AU)**:

$$P^2 = a^3 \implies P = a^{3/2} \quad \text{and} \quad a = P^{2/3}$$

#### Worked Example: An Asteroid Belt Orbit
An asteroid in the Main Belt has an orbital period of $8.0\text{ years}$. What is its semi-major axis?

1. Use $a = P^{2/3}$.
2. $a = 8.0^{2/3} = (8^{1/3})^2 = 2^2 = 4.0\text{ AU}$.

The asteroid orbits at an average distance of $4.0\text{ AU}$ from the Sun.

---

### 3. Orbital Velocity and the Vis-Viva Equation

Kepler's Second Law tells us that a line joining a planet and the Sun sweeps out equal areas during equal intervals of time. In practical terms: **objects move fastest at periastron and slowest at apastron**.

To compute the speed $v$ at any distance $r$ from a central mass $M$, we use the **vis-viva equation**:

$$v^2 = GM \left( \frac{2}{r} - \frac{1}{a} \right)$$

Where:
- $G = 6.674 \times 10^{-11}\text{ m}^3\text{kg}^{-1}\text{s}^{-2}$
- $M$ is the mass of the central body ($M_\odot \approx 1.989 \times 10^{30}\text{ kg}$ for the Sun)
- $\mu = GM$ is the standard gravitational parameter (for the Sun, $\mu_\odot \approx 1.327 \times 10^{20}\text{ m}^3\text{s}^{-2}$)

Substitute $r_p = a(1 - e)$ and $r_a = a(1 + e)$ into the vis-viva equation to find the extreme velocities:

$$v_p = \sqrt{\frac{GM}{a} \left( \frac{1 + e}{1 - e} \right)}$$
$$v_a = \sqrt{\frac{GM}{a} \left( \frac{1 - e}{1 + e} \right)}$$

Notice that by conservation of specific angular momentum ($h = r_p v_p = r_a v_a$):

$$\frac{v_p}{v_a} = \frac{r_a}{r_p} = \frac{1 + e}{1 - e}$$

#### Worked Example: Speed of a Comet at Perihelion and Aphelion
A comet orbits the Sun ($GM = 1.327 \times 10^{20}\text{ m}^3\text{s}^{-2}$) with $a = 10.0\text{ AU}$ and eccentricity $e = 0.80$.

1. **Convert $a$ to SI units:**
   $$1\text{ AU} \approx 1.496 \times 10^{11}\text{ m} \implies a = 1.496 \times 10^{12}\text{ m}$$

2. **Compute the circular speed scale $\sqrt{GM / a}$:**
   $$\sqrt{\frac{1.327 \times 10^{20}}{1.496 \times 10^{12}}} = \sqrt{8.870 \times 10^7} \approx 9418\text{ m/s} \approx 9.42\text{ km/s}$$

3. **Compute perihelion velocity ($v_p$):**
   $$v_p = 9.42 \times \sqrt{\frac{1 + 0.8}{1 - 0.8}} = 9.42 \times \sqrt{\frac{1.8}{0.2}} = 9.42 \times \sqrt{9} = 9.42 \times 3 = 28.26\text{ km/s}$$

4. **Compute aphelion velocity ($v_a$):**
   $$v_a = 9.42 \times \sqrt{\frac{1 - 0.8}{1 + 0.8}} = 9.42 \times \sqrt{\frac{1}{9}} = \frac{9.42}{3} = 3.14\text{ km/s}$$

---

### Common Mistakes to Avoid

1. **Mixing Units in Kepler's Third Law:** Using kilometers or meters directly into $P^2 = a^3$. The simple formula $P^2 = a^3$ holds *only* when $P$ is in years and $a$ is in AU around a $1\text{ M}_\odot$ body. In SI units, you must include $GM$: $P^2 = \frac{4\pi^2}{GM} a^3$.
2. **Confusing Distance with Semi-Major Axis in the Vis-Viva Equation:** In $v^2 = GM(2/r - 1/a)$, $r$ is the *instantaneous* distance from the center of mass, whereas $a$ is the fixed semi-major axis. They are equal only when the body crosses the minor axis.

---

### Day 1 Recap
- **Elliptical bounds:** Closest approach is $r_p = a(1-e)$ and farthest is $r_a = a(1+e)$.
- **Period and Size:** In Solar System units, $P^2 = a^3$; longer orbits take non-linearly longer times.
- **Velocity extremes:** Orbital speed changes continuously; the ratio of periastron to apastron speed is strictly $(1+e)/(1-e)$.

---

## Practice task

An eccentric asteroid has a perihelion distance of $r_p = 0.5\text{ AU}$ and an aphelion distance of $r_a = 4.5\text{ AU}$ around the Sun.

1. Calculate the asteroid's semi-major axis ($a$) in AU and its orbital eccentricity ($e$).
2. Calculate the asteroid's orbital period ($P$) in Earth years.
3. If the asteroid's speed at aphelion is measured to be $9.3\text{ km/s}$, calculate its exact speed at perihelion in $\text{km/s}$ using the conservation of angular momentum relation.

Show your intermediate formulas and calculations clearly.

| Criterion | What good looks like | Points |
| --- | --- | --- |
| Semi-major axis and Eccentricity | Calculates a = (rp + ra)/2 = 2.5 AU, and derives eccentricity e = (ra - rp)/(ra + rp) = 4.0/5.0 = 0.80 (or via rp = a(1-e)). | 3 |
| Orbital Period Calculation | Applies Kepler's Third Law (P^2 = a^3) to find P = (2.5)^(3/2) ≈ 3.95 years (accept 3.9 to 4.0 years). | 3 |
| Perihelion Speed Calculation | Applies angular momentum conservation / Kepler's second law (vp * rp = va * ra or vp = va * (1+e)/(1-e)) to compute vp = 9.3 * (4.5 / 0.5) = 9.3 * 9 = 83.7 km/s. | 4 |

---

## Quiz

**1. A newly discovered Kuiper Belt Object has an orbital period of 125 Earth years around the Sun. What is its semi-major axis?** _(topic: `keplers-laws`)_

- A. 11.2 AU
- B. 25.0 AU
- C. 55.9 AU
- D. 625.0 AU

> Answer: **B**. Using Kepler's Third Law in Solar System units, a = P^(2/3). Since 125^(1/3) = 5, squaring this gives 5^2 = 25.0 AU. A common mistake is calculating (125)^(1/2) ≈ 11.2 AU, which confuses P and a.

**2. An exoplanet orbits its star with a semi-major axis of 2.0 AU and an eccentricity of 0.60. What is its distance from the star at periastron?** _(topic: `orbital-mechanics`)_

- A. 0.8 AU
- B. 1.2 AU
- C. 3.2 AU
- D. 1.4 AU

> Answer: **A**. Periastron distance is given by r_p = a(1 - e) = 2.0 * (1 - 0.60) = 2.0 * 0.40 = 0.8 AU. The value 3.2 AU is the apastron distance (a(1+e)), and 1.2 AU results from incorrectly multiplying a * e.

**3. If a satellite in an elliptical orbit around Earth has its apogee distance double while keeping its perigee distance identical, what happens to its semi-major axis?** _(topic: `orbital-mechanics`)_

- A. It doubles.
- B. It stays the same.
- C. It increases, but does not double.
- D. It quadruples.

> Answer: **C**. The semi-major axis is a = (r_p + r_a) / 2. If r_a doubles to 2*r_a, the new semi-major axis is (r_p + 2*r_a)/2 = a + r_a/2. Because r_p is unchanged and positive, the new semi-major axis increases, but is less than double.

**4. A space probe is in an eccentric orbit around the Sun with an eccentricity of e = 0.5. What is the ratio of its orbital speed at perihelion to its speed at aphelion (v_p / v_a)?** _(topic: `orbital-mechanics`)_

- A. 1.5
- B. 2.0
- C. 3.0
- D. 9.0

> Answer: **C**. From angular momentum conservation, r_p * v_p = r_a * v_a, so v_p / v_a = r_a / r_p = (1 + e) / (1 - e). With e = 0.5, (1 + 0.5)/(1 - 0.5) = 1.5 / 0.5 = 3.0. A common error is taking (1+e)/(1) = 1.5, forgetting the denominator.

**5. According to Kepler's Second Law, which physical quantity remains constant for an orbiting body in a central gravitational field?** _(topic: `keplers-laws`)_

- A. Linear momentum
- B. Specific angular momentum
- C. Orbital kinetic energy
- D. Gravitational potential energy

> Answer: **B**. Kepler's Second Law (areal velocity dA/dt = h/2 = constant) is a direct consequence of the conservation of angular momentum under a central force. Kinetic energy, potential energy, and linear momentum all vary continuously throughout an eccentric orbit.

