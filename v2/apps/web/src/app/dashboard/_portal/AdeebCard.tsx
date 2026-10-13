"use client";

import { HandHeart, Heart } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";

/**
 * **بطاقةُ صاحب الحساب في صدر الرئيسية** — بطاقةٌ حقيقيّة (المالك ٢٠٢٦-١٠-١٣): حافّةٌ داخليّةٌ كحافّة
 * البلاستيك، ووهجٌ من ركنها، ولمعةٌ تعبرها عند المرور، وصورتُه بجانب اسمه كبطاقة الهويّة، والمكانةُ
 * شارةٌ بأيقونتها. والنقشُ إكليلان في زاويتين متقابلتين (`::before` و`.agw-card-seal`). أنماطُها
 * `.agw-card*` في المكتبة. للمتطوّع كحليّةٌ، ولصديق أدِيب فاتحة.
 */
export function AdeebCard({ name, avatar, gender, volunteer, standing, since }: {
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  volunteer: boolean;
  /** اسمُ المكانة كما يُقال («متطوّعة أدِيب»). */
  standing: string;
  /** «منذ أغسطس 2026» أو فارغ. */
  since: string;
}) {
  return (
    <div className={"agw-card agw-card-sm" + (volunteer ? "" : " agw-card-friend")}>
      <div className="agw-card-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="agw-card-logo" src={volunteer ? "/brand/logo-horizontal-white.svg" : "/brand/logo-horizontal.svg"} alt="أدِيب" />
        <span className="agw-card-tier">{volunteer ? <HandHeart aria-hidden /> : <Heart aria-hidden />}{standing}</span>
      </div>
      <span className="agw-card-seal" aria-hidden />
      <div className="agw-card-who">
        <Avatar name={name} src={avatar ?? undefined} gender={gender} size="lg" className="agw-card-av" />
        <div>
          <div className="agw-card-name">{name}</div>
          {since ? <div className="agw-card-since">{since}</div> : null}
        </div>
      </div>
    </div>
  );
}
