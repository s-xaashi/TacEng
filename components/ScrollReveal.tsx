"use client";
import {useEffect,useRef,useState} from "react";
export default function ScrollReveal({children,className=""}:{children:React.ReactNode;className?:string}){
 const ref=useRef<HTMLDivElement>(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{const node=ref.current;if(!node)return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect()}},{threshold:.12,rootMargin:"0px 0px -40px"});observer.observe(node);return()=>observer.disconnect()},[]);
 return <div ref={ref} className={"reveal "+(visible?"reveal-visible ":"")+className}>{children}</div>
}
