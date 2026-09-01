import { describe, expect, it } from 'vitest';
import { parseCards } from '../cards';
import { compareHands, evaluateHand } from '../hand';

function ev(text: string) {
  return evaluateHand(parseCards(text));
}

describe('hand evaluation', () => {
  it('ranks royal flush above straight flush', () => {
    const royal = ev('As Ks Qs Js Ts 2d 3c');
    const sf = ev('9s 8s 7s 6s 5s 2d 3c');
    expect(royal.category).toBe('royal-flush');
    expect(sf.category).toBe('straight-flush');
    expect(compareHands(parseCards('As Ks Qs Js Ts'), parseCards('9s 8s 7s 6s 5s'))).toBeGreaterThan(0);
  });

  it('detects wheel straight (A-2-3-4-5)', () => {
    const wheel = ev('Ah 2c 3d 4s 5h 9c Kd');
    expect(wheel.category).toBe('straight');
    expect(wheel.score[1]).toBe(5);
    const sixHigh = ev('2c 3d 4s 5h 6c 9c Kd');
    expect(compareHands(parseCards('2c 3d 4s 5h 6c'), parseCards('Ah 2c 3d 4s 5h'))).toBeGreaterThan(0);
    expect(sixHigh.score[1]).toBe(6);
  });

  it('detects steel wheel (A-5 suited straight flush)', () => {
    const r = ev('Ah 2h 3h 4h 5h 9c Kd');
    expect(r.category).toBe('straight-flush');
    expect(r.score[1]).toBe(5);
  });

  it('ranks four of a kind, full house, flush, straight', () => {
    expect(ev('Ah Ad Ac As 9h 2c 3d').category).toBe('four-of-a-kind');
    expect(ev('Ah Ad Ac Ks Kh 2c 3d').category).toBe('full-house');
    expect(ev('Ah Kh 9h 5h 2h 3c 4d').category).toBe('flush');
    expect(ev('9h 8d 7c 6s 5h 2c 3d').category).toBe('straight');
  });

  it('uses kickers to break ties', () => {
    const a = parseCards('Ah Ad 9c 8s 2h');
    const b = parseCards('Ac As 9d 7s 2c');
    expect(compareHands(a, b)).toBeGreaterThan(0);
    const splitA = parseCards('Ah Ad Kh 9c 2s');
    const splitB = parseCards('Ac As Ks 9d 2h');
    expect(compareHands(splitA, splitB)).toBe(0);
  });

  it('two pair vs two pair uses the kicker', () => {
    const a = ev('Ah Kd Ac Ks 9h 2c 3d');
    const b = ev('As Kh Ad Kc 8h 2s 3c');
    expect(a.category).toBe('two-pair');
    expect(compareHands(
      parseCards('Ah Kd Ac Ks 9h'),
      parseCards('As Kh Ad Kc 8h'),
    )).toBeGreaterThan(0);
  });

  it('trips vs two pair', () => {
    const trips = parseCards('9h 9d 9c As Kd');
    const two = parseCards('Ah Ad Kc Ks Qd');
    expect(compareHands(trips, two)).toBeGreaterThan(0);
  });

  it('picks best five from seven (full house over trips)', () => {
    const r = ev('Ah Ad Ac 9s 9h 2c 3d');
    expect(r.category).toBe('full-house');
    expect(r.name).toMatch(/Aces full of Nines/);
  });

  it('high card names ace high', () => {
    const r = ev('Ah Kd 9c 7s 2h 3d 4c');
    expect(r.category).toBe('high-card');
    expect(r.name).toBe('Ace high');
  });
});
