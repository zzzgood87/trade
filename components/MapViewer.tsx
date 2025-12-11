'use client';

import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        kakao: any;
    }
}

interface MapViewerProps {
    address: string;
}

export default function MapViewer({ address }: MapViewerProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) {
            return;
        }

        // SDK 로드 완료 대기
        window.kakao.maps.load(() => {
            // 1. 지도 초기화 (최초 1회)
            if (!mapInstance.current && mapContainer.current) {
                const options = {
                    center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울시청 기본값
                    level: 3,
                };
                mapInstance.current = new window.kakao.maps.Map(mapContainer.current, options);

                // 줌 컨트롤 추가
                const zoomControl = new window.kakao.maps.ZoomControl();
                mapInstance.current.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
            }

            // 2. 주소 -> 좌표 변환 및 마커 이동
            if (address && mapInstance.current) {
                const geocoder = new window.kakao.maps.services.Geocoder();

                geocoder.addressSearch(address, (result: any, status: any) => {
                    if (status === window.kakao.maps.services.Status.OK) {
                        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

                        // 기존 마커 제거
                        if (markerInstance.current) {
                            markerInstance.current.setMap(null);
                        }

                        // 새 마커 생성
                        markerInstance.current = new window.kakao.maps.Marker({
                            map: mapInstance.current,
                            position: coords,
                        });

                        // 인포윈도우 (주소 표시)
                        const infowindow = new window.kakao.maps.InfoWindow({
                            content: `<div style="padding:5px;font-size:12px;color:#000;">${address}</div>`
                        });
                        infowindow.open(mapInstance.current, markerInstance.current);

                        // 지도 중심 이동
                        mapInstance.current.setCenter(coords);
                    }
                });
            }
        });
    }, [address]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full rounded-xl shadow-inner bg-gray-100" />
            {!address && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10 rounded-xl">
                    <p className="text-gray-500 font-medium">리스트를 클릭하면 위치가 표시됩니다</p>
                </div>
            )}
        </div>
    );
}