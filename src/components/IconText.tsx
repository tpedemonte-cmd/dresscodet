import { Fragment } from 'react';
import { BriefcaseBusiness, Heart, Users, House, PartyPopper, Dumbbell, GraduationCap, Sun, Cloud, CloudRain, CloudLightning, Moon, Thermometer, Wind, Leaf, Snowflake, Flower2, Glasses, Scale, Shirt, ShoppingBag, ShoppingCart, Watch, Link, Circle, Gem, Package, Check, WashingMachine, Handshake, Scissors, Sparkles, Smile, Zap, ThumbsUp, ThumbsDown, Search, Lightbulb, Lock, BarChart3, Trophy, ClipboardList, UserRound, type LucideIcon } from 'lucide-react';
import { REALISTIC_ICON_TRIAL } from './OccasionLabel';

const photos = import.meta.glob<string>('../assets/category-photos/*.jpg', { eager: true, import: 'default' });
const clothing: Record<string, string> = {
  '👕': 'remera', '👖': 'jean', '🧥': 'campera', '🧶': 'buzo', '🥼': 'sweater', '👔': 'camisa', '🩳': 'short', '👗': 'vestido', '💃': 'pollera', '👟': 'zapatillas', '👞': 'zapatos', '🧦': 'medias', '🎒': 'mochila', '👜': 'cartera', '📿': 'cadena', '💍': 'anillo', '🧿': 'pulsera', '🕶': 'lentes', '🧢': 'gorra', '🩴': 'ojotas', '🧣': 'bufanda', '👛': 'billetera', '🧤': 'guantes', '💎': 'aros',
};
const symbols: Record<string, LucideIcon> = {
  '💼': BriefcaseBusiness, '❤': Heart, '💕': Heart, '🍻': Users, '👨‍👩‍👧': House, '🎉': PartyPopper, '🏋': Dumbbell, '📚': GraduationCap,
  '☀': Sun, '🌞': Sun, '☁': Cloud, '🌤': Cloud, '🌧': CloudRain, '⛈': CloudLightning, '🌙': Moon, '🌡': Thermometer, '💨': Wind, '🍂': Leaf, '❄': Snowflake, '🌸': Flower2,
  '😎': Glasses, '⚖': Scale, '🎩': Shirt, '🛍': ShoppingBag, '🛒': ShoppingCart, '⌚': Watch, '🔗': Link, '📦': Package,
  '✅': Check, '🧼': WashingMachine, '🤝': Handshake, '🧵': Scissors, '✨': Sparkles, '💫': Sparkles, '⭐': Sparkles, '😊': Smile, '😌': Smile, '🙂': UserRound, '⚡': Zap,
  '👍': ThumbsUp, '👎': ThumbsDown, '🔍': Search, '💡': Lightbulb, '🔒': Lock, '📊': BarChart3, '🏆': Trophy, '📋': ClipboardList, '🏠': House,
};
const emojiPattern = /(\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;

/** Presentation only: preserve stored notes, AI text and category keys unchanged. */
export default function IconText({ text }: { text: string | number | null | undefined }) {
  if (text == null) return null;
  if (!REALISTIC_ICON_TRIAL || typeof text === 'number') return <>{text}</>;
  return <>{text.split(emojiPattern).map((part, index) => {
    if (!part) return null;
    const glyph = part.replace(/\uFE0F/g, '');
    const photo = clothing[glyph];
    if (photo) return <img key={index} src={photos[`../assets/category-photos/${photo}.jpg`]} alt="" aria-hidden="true" loading="lazy" width={24} height={24} className="inline-block h-[1.35em] w-[1.35em] shrink-0 rounded-sm object-cover align-middle" />;
    const Icon = symbols[glyph];
    if (Icon) return <Icon key={index} aria-hidden="true" strokeWidth={1.5} className="inline-block h-[1em] w-[1em] align-middle text-current" />;
    if (/\p{Extended_Pictographic}/u.test(part)) return <Circle key={index} aria-hidden="true" strokeWidth={1.5} className="inline-block h-[1em] w-[1em] align-middle text-current" />;
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}